import { bits, mask } from '../bits';
import { decode, type DecodeResult } from '../isa/encoding';
import { evaluationOrder, type ComponentSpec } from '../netlist';
import {
  add32,
  alu,
  aluControl,
  control,
  dmemRead,
  dmemWrite,
  imemRead,
  inDmem,
  jumpConcat,
  KNOWN_FUNCTS,
  KNOWN_OPCODES,
  mux2,
  signExtend,
  shiftLeft2,
  IMEM_WORDS,
  wordAddress,
  type AluResult,
} from './components';
import { MONO_NETLIST, type MonoKind } from './datapath';
import type { MonoState } from './state';

export type AlertCode =
  /** Opcode que o controle principal não reconhece: todos os sinais em 0. */
  | 'opcode-desconhecido'
  /** ALUOp = 10 com funct desconhecido: controle da ULA = 000 (AND). */
  | 'funct-desconhecido'
  /** lw/sw fora da memória de dados simulada: leitura 0, escrita ignorada. */
  | 'dmem-fora-da-memoria'
  /** Endereço não múltiplo de 4 (no MIPS real: exceção). O simulador alinha. */
  | 'dmem-desalinhado'
  /** PC fora da memória de instruções simulada: lê 0x00000000. */
  | 'pc-fora-da-imem';

export interface Alert {
  code: AlertCode;
  /** Componente da netlist onde o alerta acontece (para destacar no datapath). */
  component: string;
  /** Valor que causou o alerta (opcode, funct, endereço ou PC). */
  value: number;
}

export interface Snapshot {
  /** Número do ciclo (1 = primeiro ciclo após o estado inicial). */
  cycle: number;
  /** Valor de TODOS os fios da netlist (uint32, já na largura do fio), antes da borda. */
  wires: Readonly<Record<string, number>>;
  /** A instrução deste ciclo, decodificada. */
  decoded: DecodeResult;
  /** Sinais internos de blocos com "detalhes" (painel do componente). */
  internals: { alu: AluResult['internals'] & { overflow: 0 | 1 } };
  alerts: readonly Alert[];
  /** O que muda na borda de subida. */
  writes: {
    pc: { before: number; after: number };
    reg?: { index: number; before: number; after: number };
    mem?: { address: number; bytes: readonly { index: number; before: number; after: number }[] };
  };
}

/**
 * Sobrescritas de fio: o valor calculado pelo componente passa por esta função
 * antes de seguir no datapath (ex.: sinal de controle travado em 1, Zero invertido).
 * É o gancho da injeção de falhas (`core/faults`) e do quiz.
 */
export type Overrides = Readonly<Record<string, (value: number) => number>>;

export interface StepOptions {
  overrides?: Overrides;
}

export interface StepResult {
  next: MonoState;
  snapshot: Snapshot;
}

type Read = (port: string) => number;

interface EvalContext {
  state: MonoState;
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
  const: (_i, _ctx, spec) => ({ out: spec.params?.['value'] ?? 0 }),
  pc: (_i, ctx) => ({ out: ctx.state.pc }),
  adder: (i) => ({ sum: add32(i('a'), i('b')).sum }),
  imem: (i, ctx, spec) => {
    const pc = i('address');
    if (pc >= IMEM_WORDS * 4) {
      ctx.alerts.push({ code: 'pc-fora-da-imem', component: spec.id, value: pc });
    }
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
    ctx.internals.alu = { ...r.internals, overflow: r.overflow };
    return { result: r.result, zero: r.zero };
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
  opts: StepOptions = {},
): Pick<Snapshot, 'wires' | 'alerts' | 'internals'> {
  const wires: Record<string, number> = {};
  const ctx: EvalContext = { state, alerts: [], internals: {} };
  for (const spec of ORDER) {
    const outputs = EVALUATE[spec.kind](reader(spec.id, wires), ctx, spec);
    for (const o of spec.outputs) {
      const value = outputs[o.name];
      if (value === undefined) throw new Error(`${spec.id} não calculou a saída ${o.name}`);
      for (const w of OUTPUT_WIRES.get(`${spec.id}.${o.name}`) ?? []) {
        const f = opts.overrides?.[w.id];
        wires[w.id] = ((f ? f(value) : value) & mask(w.width)) >>> 0;
      }
    }
  }
  memoryAccessAlerts(wires, ctx.alerts);
  return { wires, alerts: ctx.alerts, internals: ctx.internals as Snapshot['internals'] };
}

function memoryAccessAlerts(wires: Record<string, number>, alerts: Alert[]): void {
  if (wires['MemRead'] !== 1 && wires['MemWrite'] !== 1) return;
  const address = wires['alu_result']!;
  if (!inDmem(address)) {
    alerts.push({ code: 'dmem-fora-da-memoria', component: 'dmem', value: address });
  }
  if ((address & 3) !== 0) {
    alerts.push({ code: 'dmem-desalinhado', component: 'dmem', value: address });
  }
}

/**
 * Um ciclo de clock: avalia a lógica combinacional com o estado atual e aplica a
 * borda de subida (PC, banco de registradores, memória de dados). Função pura.
 */
export function step(state: MonoState, opts: StepOptions = {}): StepResult {
  const { wires, alerts, internals } = evaluate(state, opts);
  const v = (id: string) => wires[id]!;

  // Borda de subida.
  const nextPc = v('next_pc');
  const writes: Snapshot['writes'] = { pc: { before: v('pc'), after: nextPc } };

  let regs = state.regs;
  const wr = v('write_reg');
  if (v('RegWrite') === 1 && wr !== 0) {
    const copy = regs.slice();
    copy[wr] = v('write_data');
    writes.reg = { index: wr, before: regs[wr]!, after: copy[wr]! };
    regs = copy;
  }

  let dmem = state.dmem;
  const address = v('alu_result');
  if (v('MemWrite') === 1 && inDmem(address)) {
    const after = dmemWrite(dmem, address, v('rd2'));
    const base = wordAddress(address);
    writes.mem = {
      address: base,
      bytes: [0, 1, 2, 3].map((k) => ({
        index: base + k,
        before: dmem[base + k]!,
        after: after[base + k]!,
      })),
    };
    dmem = after;
  }

  return {
    next: { cycle: state.cycle + 1, pc: nextPc, regs, dmem, imem: state.imem },
    snapshot: {
      cycle: state.cycle + 1,
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
