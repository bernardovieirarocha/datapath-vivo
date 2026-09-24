import { assemble } from '../isa';
import {
  CONTROL_SIGNAL_NAMES,
  dmemWord,
  exploreState,
  step,
  type ExploreValues,
  type MonoState,
  type Overrides,
  type StepResult,
} from '../mono';

/**
 * Injeção de falhas sobre o simulador (sem duplicar lógica): cada falha vira uma
 * sobrescrita de fio (`Overrides`) passada ao `step`.
 */

/** Fios em que dá para injetar falha: os sinais do controle principal e o Zero da ULA. */
export const FAULTABLE = [...CONTROL_SIGNAL_NAMES, 'zero'] as const;
export type FaultWire = (typeof FAULTABLE)[number];

export type Fault =
  /** Fio travado num valor (stuck-at 0/1; no ALUOp, 00..11). */
  | { wire: FaultWire; mode: 'stuck'; value: number }
  /** Fio invertido (ex.: Zero invertido). */
  | { wire: FaultWire; mode: 'invert' };

export function overridesOf(faults: readonly Fault[]): Overrides {
  const o: Record<string, (v: number) => number> = {};
  for (const f of faults) {
    o[f.wire] = f.mode === 'stuck' ? () => f.value : (v) => (f.wire === 'ALUOp' ? v ^ 0b11 : v ^ 1);
  }
  return o;
}

/** O que muda na borda do clock (o "resultado observável" de um ciclo). */
export interface Outcome {
  reg?: { index: number; value: number };
  mem?: { address: number; value: number };
  pc: number;
}

export function outcomeOf(r: StepResult): Outcome {
  const out: Outcome = { pc: r.next.pc };
  const reg = r.snapshot.writes.reg;
  if (reg) out.reg = { index: reg.index, value: reg.after };
  const mem = r.snapshot.writes.mem;
  if (mem) out.mem = { address: mem.address, value: dmemWord(r.next.dmem, mem.address) };
  return out;
}

export type Difference =
  | { kind: 'reg'; expected?: Outcome['reg']; actual?: Outcome['reg'] }
  | { kind: 'mem'; expected?: Outcome['mem']; actual?: Outcome['mem'] }
  | { kind: 'pc'; expected: number; actual: number };

const same = <T extends object>(a?: T, b?: T) => JSON.stringify(a) === JSON.stringify(b);

export function diff(expected: Outcome, actual: Outcome): Difference[] {
  const d: Difference[] = [];
  if (!same(expected.reg, actual.reg))
    d.push({ kind: 'reg', expected: expected.reg, actual: actual.reg });
  if (!same(expected.mem, actual.mem))
    d.push({ kind: 'mem', expected: expected.mem, actual: actual.mem });
  if (expected.pc !== actual.pc) d.push({ kind: 'pc', expected: expected.pc, actual: actual.pc });
  return d;
}

export interface Comparison {
  correct: StepResult;
  faulty: StepResult;
  differences: Difference[];
}

/** Roda o mesmo ciclo sem e com as sobrescritas e compara o resultado. */
export function compare(state: MonoState, overrides: Overrides): Comparison {
  const correct = step(state);
  const faulty = step(state, { overrides });
  return { correct, faulty, differences: diff(outcomeOf(correct), outcomeOf(faulty)) };
}

/** Um caso de teste de uma classe de instrução, com valores que tornam os erros visíveis. */
export interface FaultCase {
  id: string;
  label: string;
  asm: string;
  values: ExploreValues;
}

export const FAULT_CASES: readonly FaultCase[] = [
  { id: 'add', label: 'add', asm: 'add $8, $17, $18', values: { regs: { 17: 12, 18: 30 } } },
  { id: 'sub', label: 'sub', asm: 'sub $8, $17, $18', values: { regs: { 17: 30, 18: 12 } } },
  { id: 'and', label: 'and', asm: 'and $8, $17, $18', values: { regs: { 17: 12, 18: 10 } } },
  { id: 'or', label: 'or', asm: 'or $8, $17, $18', values: { regs: { 17: 12, 18: 10 } } },
  { id: 'slt', label: 'slt', asm: 'slt $8, $17, $18', values: { regs: { 17: 20000, 18: 30000 } } },
  { id: 'addi', label: 'addi', asm: 'addi $8, $17, 20', values: { regs: { 17: 12 } } },
  { id: 'lw', label: 'lw', asm: 'lw $8, 8($17)', values: { regs: { 17: 64 }, mem: { 72: 555 } } },
  { id: 'sw', label: 'sw', asm: 'sw $8, 8($17)', values: { regs: { 8: 99, 17: 64 } } },
  {
    id: 'beq-t',
    label: 'beq (tomado)',
    asm: 'beq $17, $18, 3',
    values: { pc: 8, regs: { 17: 7, 18: 7 } },
  },
  {
    id: 'beq-n',
    label: 'beq (não tomado)',
    asm: 'beq $17, $18, 3',
    values: { pc: 8, regs: { 17: 9, 18: 7 } },
  },
  { id: 'j', label: 'j', asm: 'j 20', values: { pc: 8 } },
];

function word(asm: string): number {
  const r = assemble(asm);
  if (!r.ok) throw new Error(`caso inválido: ${asm}`);
  return r.program.words[0]!;
}

export interface CaseResult {
  case: FaultCase;
  state: MonoState;
  comparison: Comparison;
  works: boolean;
}

/** Roda todos os casos com as falhas e diz quais instruções passam a falhar. */
export function runFaultCases(faults: readonly Fault[]): CaseResult[] {
  const o = overridesOf(faults);
  return FAULT_CASES.map((c) => {
    const state = exploreState(word(c.asm), c.values);
    const comparison = compare(state, o);
    return { case: c, state, comparison, works: comparison.differences.length === 0 };
  });
}
