/**
 * Aritmética de 32 bits sem sinal (uint32), como no hardware.
 *
 * Em JS, `number` é double e os operadores bit a bit devolvem int32 com sinal.
 * Todo valor que representa um fio/registrador do processador deve passar por
 * `u32` (ou sair de uma destas funções), para ficar sempre em [0, 2^32).
 */

const MASK_32 = 0xffffffff;

/** Converte para uint32 (bits idênticos, interpretado sem sinal). */
export function u32(x: number): number {
  return x >>> 0;
}

/** Interpreta os 32 bits de `x` como inteiro com sinal (complemento de 2). */
export function toSigned(x: number): number {
  return x | 0;
}

/** Extensão de sinal de 16 → 32 bits (bloco "Extensão de Sinal"). Devolve uint32. */
export function signExt16(x: number): number {
  return ((x << 16) >> 16) >>> 0;
}

/** Máscara com `width` bits em 1 (0 ≤ width ≤ 32), como uint32. */
export function mask(width: number): number {
  assertWidth(width);
  return width === 32 ? MASK_32 : ((1 << width) - 1) >>> 0;
}

/**
 * Fatia `x[hi:lo]` (notação Verilog, inclusiva). Ex.: `bits(instr, 31, 26)` = opcode.
 * Devolve uint32 alinhado à direita.
 */
export function bits(x: number, hi: number, lo: number): number {
  if (!Number.isInteger(hi) || !Number.isInteger(lo) || lo < 0 || hi > 31 || lo > hi) {
    throw new RangeError(`fatia inválida [${hi}:${lo}]`);
  }
  return ((x >>> lo) & mask(hi - lo + 1)) >>> 0;
}

/** Bit `x[i]` como 0 ou 1. */
export function bit(x: number, i: number): 0 | 1 {
  return bits(x, i, i) as 0 | 1;
}

/**
 * Hexadecimal com prefixo `0x`, maiúsculo, com `digits` dígitos (padrão 8 = 32 bits).
 * Bits acima de `4 * digits` são descartados, como numa fatia do fio.
 */
export function hex(x: number, digits = 8): string {
  assertWidth(digits * 4);
  const v = (x & mask(digits * 4)) >>> 0;
  return '0x' + v.toString(16).toUpperCase().padStart(digits, '0');
}

/** Binário com `width` bits (padrão 32), sem prefixo. Bits acima de `width` são descartados. */
export function bin(x: number, width = 32): string {
  const v = (x & mask(width)) >>> 0;
  return v.toString(2).padStart(width, '0');
}

function assertWidth(width: number): void {
  if (!Number.isInteger(width) || width < 0 || width > 32) {
    throw new RangeError(`largura inválida: ${width} (esperado 0..32)`);
  }
}
