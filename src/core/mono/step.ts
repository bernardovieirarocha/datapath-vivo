import { bits, mask, u32 } from '../bits';
import { decode, type DecodeResult } from '../isa/encoding';
import { evaluationOrder, type ComponentSpec } from '../netlist';
import {
  add32,
  alu,
  aluControl,
  control,
  dmemByteIndices,
  dmemRead,
  dmemWrite,
  imemRead,
  jumpConcat,
  KNOWN_FUNCTS,
  KNOWN_OPCODES,
  mux2,
  signExtend,
  shiftLeft2,
  DMEM_BYTES,
  IMEM_WORDS,
  type AluResult,
} from './components';
import { MONO_NETLIST, type MonoKind } from './datapath';
import type { MonoState } from './state';

export type AlertCode =
  /** Opcode que o `controle_principal.v` não reconhece: todos os sinais em 0. */
  | 'opcode-desconhecido'
  /** ALUOp = 10 com funct desconhecido: `alu_op` = 000 (AND). */
  | 'funct-desconhecido'
  /** Acesso a byte ≥ 64 na memória de dados: no Verilog lê X / a escrita some. */
  | 'dmem-fora-da-memoria'
  /** Endereço ≥ 256: só `address[7:2]` é usado, o acesso "dá a volta". */
  | 'dmem-endereco-alto'
  /** Endereço não múltiplo de 4: os 2 bits de baixo são ignorados. */
  | 'dmem-desalinhado'
  /** PC ≥ 128: a memória de instruções só usa PC[6:2] e "dá a volta". */
  | 'pc-alem-da-imem';

export interface Alert {
  code: AlertCode;
  /** Componente da netlist onde o alerta acontece (para destacar no datapath). */
  component: string;
  /** Valor que causou o alerta (opcode, funct, endereço ou PC). */
  value: number;
}

export interface StepInput {
  /** Reset (KEY0) pressionado neste ciclo: PC = 0 e escritas desabilitadas. */
  reset?: boolean;
}

export interface Snapshot {
  /** Número do ciclo (1 = primeiro ciclo após o estado inicial). */
  cycle: number;
  reset: boolean;
  /** Valor de TODOS os fios da netlist (uint32, já na largura do fio), antes da borda. */
  wires: Readonly<Record<string, number>>;
  /** A instrução deste ciclo, decodificada. */
  decoded: DecodeResult;
  /** Sinais internos de blocos com "detalhes" (painel do componente). */
  internals: { alu: AluResult['internals'] };
  alerts: readonly Alert[];
  /** O que muda na borda de subida. */
  writes: {
    pc: { before: number; after: number };
    reg?: { index: number; before: number; after: number };
    mem?: { address: number; bytes: readonly { index: number; before: number; after: number }[] };
  };
}

export interface StepResult {
  next: MonoState;
  snapshot: Snapshot;
}

type Read = (port: string) => number;

interface EvalContext {
  state: MonoState;
  reset: boolean;
  alerts: Alert[];
  internals: Partial<Snapshot['internals']>;
}

type Evaluate = (
  inp: Read,
  ctx: EvalContext,
  spec: ComponentSpec<MonoKind>,
) => Record<string, number>;

/** Comportamento combinacional de cada tipo de componente. */
const EVALUATE: Record<MonoKind, Evaluate> = {
  input: (_i, ctx) => ({ out: ctx.reset ? 1 : 0 }),
  const: (_i, _ctx, spec) => ({ out: spec.params?.['value'] ?? 0 }),
  pc: (i, ctx) => ({ out: i('reset') ? 0 : ctx.state.pc }),
  adder: (i) => ({ sum: add32(i('a'), i('b')).sum }),
  imem: (i, ctx, spec) => {
    const pc = i('address');
    if (pc >= IMEM_WORDS * 4)
      ctx.alerts.push({ code: 'pc-alem-da-imem', component: spec.id, value: pc });
    return { instruction: imemRead(ctx.state.imem, pc) };
  },
  fields: (i) => {
    const w = i('instruction');
    return {
      opcode: bits(w, 31, 26),
      rs: bits(w, 25, 21),
      rt: bits(w, 20, 16),
      rd: bits(w, 15, 11),
      imm16: bits(w, 15, 0),
      funct: bits(w, 5, 0),
      addr26: bits(w, 25, 0),
    };
  },
  control: (i, ctx, spec) => {
    const opcode = i('opcode');
    if (!KNOWN_OPCODES.has(opcode)) {
      ctx.alerts.push({ code: 'opcode-desconhecido', component: spec.id, value: opcode });
    }
    return { ...control(opcode) };
  },
  mux: (i) => ({ out: mux2(i('sel'), i('in0'), i('in1')) }),
  andNot: (i) => ({ out: i('a') & (i('notB') ^ 1) }),
  and: (i) => ({ out: i('a') & i('b') }),
  regfile: (i, ctx) => {
    const r = (n: number) => (n === 0 ? 0 : (ctx.state.regs[n] ?? 0));
    return { data1: r(i('read1')), data2: r(i('read2')) };
  },
  signExt: (i) => ({ out: signExtend(i('in')) }),
  aluControl: (i, ctx, spec) => {
    const aluOp = i('aluOp');
    const funct = i('funct');
    if (aluOp === 0b10 && !KNOWN_FUNCTS.has(funct)) {
      ctx.alerts.push({ code: 'funct-desconhecido', component: spec.id, value: funct });
    }
    return { op: aluControl(aluOp, funct) };
  },
  alu: (i, ctx) => {
    const r = alu(i('a'), i('b'), i('op'));
    ctx.internals.alu = r.internals;
    return { result: r.result, zero: r.zero, overflow: r.overflow };
  },
  dmem: (i, ctx) => ({ readData: dmemRead(ctx.state.dmem, i('address'), i('memRead')) }),
  shiftLeft2: (i) => ({ out: shiftLeft2(i('in')) }),
  jumpConcat: (i) => ({ out: jumpConcat(i('pcPlus4'), i('shifted')) }),
};

// Pré-cálculo sobre a netlist (feito uma vez).
const COMPONENTS = new Map(MONO_NETLIST.components.map((c) => [c.id, c]));
const ORDER = evaluationOrder(MONO_NETLIST).map((id) => COMPONENTS.get(id)!);
/** "componente.porta de entrada" → id do fio. */
const INPUT_WIRE = new Map<string, string>();
/** "componente.porta de saída" → fios que ela alimenta. */
const OUTPUT_WIRES = new Map<string, { id: string; width: number }[]>();
for (const w of MONO_NETLIST.wires) {
  for (const t of w.to) INPUT_WIRE.set(`${t.component}.${t.port}`, w.id);
  const key = `${w.from.component}.${w.from.port}`;
  OUTPUT_WIRES.set(key, [...(OUTPUT_WIRES.get(key) ?? []), { id: w.id, width: w.width }]);
}

function reader(componentId: string, wires: Record<string, number>): Read {
  return (port) => {
    const id = INPUT_WIRE.get(`${componentId}.${port}`);
    const v = id === undefined ? undefined : wires[id];
    if (v === undefined) throw new Error(`${componentId}.${port} lida antes de ser calculada`);
    return v;
  };
}

/** Avalia todos os fios (lógica combinacional) a partir do estado atual. */
export function evaluate(
  state: MonoState,
  input: StepInput = {},
): Pick<Snapshot, 'wires' | 'alerts' | 'internals'> {
  const wires: Record<string, number> = {};
  const ctx: EvalContext = { state, reset: input.reset ?? false, alerts: [], internals: {} };
  for (const spec of ORDER) {
    const outputs = EVALUATE[spec.kind](reader(spec.id, wires), ctx, spec);
    for (const o of spec.outputs) {
      const value = outputs[o.name];
      if (value === undefined) throw new Error(`${spec.id} não calculou a saída ${o.name}`);
      for (const w of OUTPUT_WIRES.get(`${spec.id}.${o.name}`) ?? []) {
        wires[w.id] = (value & mask(w.width)) >>> 0;
      }
    }
  }
  memoryAccessAlerts(wires, ctx.alerts);
  return { wires, alerts: ctx.alerts, internals: ctx.internals as Snapshot['internals'] };
}

function memoryAccessAlerts(wires: Record<string, number>, alerts: Alert[]): void {
  const reads = wires['MemRead'] === 1;
  const writes = wires['mem_write_enable'] === 1;
  if (!reads && !writes) return;
  const address = wires['alu_result']!;
  if (dmemByteIndices(address).some((b) => b >= DMEM_BYTES)) {
    alerts.push({ code: 'dmem-fora-da-memoria', component: 'dmem', value: address });
  }
  if (address > 0xff)
    alerts.push({ code: 'dmem-endereco-alto', component: 'dmem', value: address });
  if ((address & 3) !== 0)
    alerts.push({ code: 'dmem-desalinhado', component: 'dmem', value: address });
}

/**
 * Um ciclo de clock: avalia a lógica combinacional com o estado atual e aplica a
 * borda de subida (PC, banco de registradores, memória de dados). Função pura.
 */
export function step(state: MonoState, input: StepInput = {}): StepResult {
  const reset = input.reset ?? false;
  const { wires, alerts, internals } = evaluate(state, input);
  const v = (id: string) => wires[id]!;

  // Borda de subida.
  const nextPc = reset ? 0 : v('next_pc');
  const writes: Snapshot['writes'] = { pc: { before: v('pc'), after: nextPc } };

  let regs = state.regs;
  const wr = v('write_reg');
  if (v('reg_write_enable') === 1 && wr !== 0) {
    const copy = regs.slice();
    copy[wr] = v('write_data');
    writes.reg = { index: wr, before: regs[wr]!, after: copy[wr]! };
    regs = copy;
  }

  let dmem = state.dmem;
  if (v('mem_write_enable') === 1) {
    const address = v('alu_result');
    const after = dmemWrite(dmem, address, v('rd2'));
    writes.mem = {
      address,
      bytes: dmemByteIndices(address)
        .filter((i) => i < DMEM_BYTES)
        .map((index) => ({ index, before: dmem[index]!, after: after[index]! })),
    };
    dmem = after;
  }

  return {
    next: { cycle: state.cycle + 1, pc: u32(nextPc), regs, dmem, imem: state.imem },
    snapshot: {
      cycle: state.cycle + 1,
      reset,
      wires,
      decoded: decode(v('instr')),
      internals,
      alerts,
      writes,
    },
  };
}

/** Roda `cycles` ciclos. Devolve os estados (inicial incluído) e os snapshots. */
export function run(
  initial: MonoState,
  cycles: number,
): { states: MonoState[]; snapshots: Snapshot[] } {
  const states = [initial];
  const snapshots: Snapshot[] = [];
  let s = initial;
  for (let n = 0; n < cycles; n++) {
    const r = step(s);
    snapshots.push(r.snapshot);
    states.push(r.next);
    s = r.next;
  }
  return { states, snapshots };
}
