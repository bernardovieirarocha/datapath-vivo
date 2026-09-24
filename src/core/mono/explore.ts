import { u32 } from '../bits';
import { DMEM_BYTES, IMEM_WORDS } from './components/memories';
import type { MonoState } from './state';

/** Valor de um registrador que o aluno não definiu: 4 × número (pequeno e alinhado). */
export const exploreReg = (n: number): number => (n === 0 ? 0 : 4 * n);

/** Valor de uma palavra da memória de dados que o aluno não definiu. */
export const exploreMem = (address: number): number => 1000 + address;

export interface ExploreValues {
  pc?: number;
  /** Registrador → valor. Os outros usam `exploreReg`. */
  regs?: Readonly<Record<number, number>>;
  /** Endereço (múltiplo de 4) → palavra. As outras usam `exploreMem`. */
  mem?: Readonly<Record<number, number>>;
}

/**
 * Estado para "ver" UMA instrução: ela fica no endereço do PC, e registradores e
 * memória têm valores não nulos e fáceis de seguir (usado no Explorar, no quiz e nas falhas).
 */
export function exploreState(word: number, v: ExploreValues = {}): MonoState {
  const pc = u32(v.pc ?? 0);
  const imem = new Array<number>(IMEM_WORDS).fill(0);
  const idx = Math.floor(pc / 4);
  if (idx < IMEM_WORDS) imem[idx] = u32(word);
  const regs = Array.from({ length: 32 }, (_, n) =>
    n === 0 ? 0 : u32(v.regs?.[n] ?? exploreReg(n)),
  );
  const dmem = new Array<number>(DMEM_BYTES).fill(0);
  for (let a = 0; a < DMEM_BYTES; a += 4) {
    const w = u32(v.mem?.[a] ?? exploreMem(a));
    for (let k = 0; k < 4; k++) dmem[a + k] = (w >>> (8 * k)) & 0xff;
  }
  return { cycle: 0, pc, regs, dmem, imem };
}
