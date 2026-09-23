import { u32 } from '../bits';
import { DMEM_BYTES, IMEM_WORDS } from './components/memories';

/** Estado arquitetural (elementos sequenciais) do monociclo. Imutável. */
export interface MonoState {
  /** Ciclos já executados (bordas de subida). */
  cycle: number;
  pc: number;
  /** 32 registradores, uint32. `regs[0]` é sempre 0. */
  regs: readonly number[];
  /** `DMEM_BYTES` bytes. */
  dmem: readonly number[];
  /** `IMEM_WORDS` palavras. */
  imem: readonly number[];
}

export interface InitialState {
  /** Palavras do programa, a partir do endereço 0 (o resto da memória fica 0). */
  program?: readonly number[];
  /** Registrador → valor inicial. */
  regs?: Readonly<Record<number, number>>;
  /** Byte → valor inicial (0..255). */
  dmemBytes?: Readonly<Record<number, number>>;
  pc?: number;
}

export function createState(init: InitialState = {}): MonoState {
  const program = init.program ?? [];
  if (program.length > IMEM_WORDS) {
    throw new RangeError(`programa com ${program.length} palavras; a memória tem ${IMEM_WORDS}`);
  }
  const imem = new Array<number>(IMEM_WORDS).fill(0);
  program.forEach((w, i) => (imem[i] = u32(w)));

  const regs = new Array<number>(32).fill(0);
  for (const [k, v] of Object.entries(init.regs ?? {})) {
    const i = Number(k);
    if (!Number.isInteger(i) || i < 0 || i > 31) throw new RangeError(`registrador inválido: ${k}`);
    if (i !== 0) regs[i] = u32(v);
  }

  const dmem = new Array<number>(DMEM_BYTES).fill(0);
  for (const [k, v] of Object.entries(init.dmemBytes ?? {})) {
    const i = Number(k);
    if (!Number.isInteger(i) || i < 0 || i >= DMEM_BYTES) {
      throw new RangeError(`byte de memória inválido: ${k} (0 a ${DMEM_BYTES - 1})`);
    }
    dmem[i] = v & 0xff;
  }

  return { cycle: 0, pc: u32(init.pc ?? 0), regs, dmem, imem };
}

/**
 * Programa de exemplo (o mesmo do golden trace, `reference/golden_trace_pratica10.json`):
 * usa beq, addi, sw, lw, sub e j num laço de período 11.
 */
export const EXEMPLO_PROGRAM: readonly number[] = [
  0x11090001, // beq $8, $9, 1
  0x21080002, // addi $8, $8, 2
  0xad880000, // sw $8, 0($12)
  0x8d900000, // lw $16, 0($12)
  0x020a4022, // sub $8, $16, $10
  0x08000000, // j 0
];

/** Estado inicial do exemplo: $8 = 5, $9 = 5, $10 = 1, $12 = 4; M[0] = 5, M[8] = 7. */
export const EXEMPLO_INITIAL: InitialState = {
  program: EXEMPLO_PROGRAM,
  regs: { 8: 5, 9: 5, 10: 1, 12: 4 },
  dmemBytes: { 0: 5, 8: 7 },
};
