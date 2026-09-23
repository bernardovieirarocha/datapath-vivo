import { mask, signExt16, u32 } from '../../bits';

/** Mux de 2 entradas: sel = 0 → in0, sel = 1 → in1. */
export function mux2(sel: number, in0: number, in1: number): number {
  return (sel & 1) === 1 ? in1 : in0;
}

/**
 * Somador de 32 bits. `cout` é o carry do bit 31 (não é usado pelo datapath).
 */
export function add32(a: number, b: number, cin: 0 | 1 = 0): { sum: number; cout: 0 | 1 } {
  const s = u32(a) + u32(b) + cin;
  return { sum: u32(s), cout: s > 0xffffffff ? 1 : 0 };
}

/** "Shift left 2": `{x[width-3:0], 2'b00}`, truncado em `width` bits. */
export function shiftLeft2(x: number, width = 32): number {
  return u32((x << 2) & mask(width));
}

/** "Extensão de Sinal": replica o bit 15 nos 16 bits de cima. */
export const signExtend = signExt16;

/** Destino do jump: `{PC+4[31:28], addr26, 2'b00}` (addr26 já deslocado → 28 bits). */
export function jumpConcat(pcPlus4: number, shifted28: number): number {
  return u32((u32(pcPlus4) & 0xf0000000) | (shifted28 & 0x0fffffff));
}
