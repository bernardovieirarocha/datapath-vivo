import { bits, u32 } from '../../bits';

/** `MemoriaInstrucao.v`: 32 palavras, endereço = PC[6:2]. */
export const IMEM_WORDS = 32;

/** `MemoriaDados.v`: 64 bytes. */
export const DMEM_BYTES = 64;

/** Palavra lida pela memória de instruções (leitura combinacional, memRead sempre 1). */
export function imemRead(imem: readonly number[], pc: number): number {
  return u32(imem[bits(pc, 6, 2)] ?? 0);
}

/**
 * Índices dos 4 bytes acessados por `address`, como no `MemoriaDados.v`:
 * `word_addr = address[7:2]`, bytes `{word_addr, 00}` … `{word_addr, 11}` (0..255).
 * Índices ≥ 64 estão fora do array (no Verilog: leitura X, escrita perdida).
 */
export function dmemByteIndices(address: number): [number, number, number, number] {
  const base = bits(address, 7, 2) * 4;
  return [base, base + 1, base + 2, base + 3];
}

/**
 * Leitura combinacional, little-endian. `MemRead = 0` → 0.
 * Bytes fora do array leem 0 aqui (no Verilog seriam X; o simulador gera alerta).
 */
export function dmemRead(bytes: readonly number[], address: number, memRead: number): number {
  if ((memRead & 1) === 0) return 0;
  const idx = dmemByteIndices(address);
  let v = 0;
  for (let k = 3; k >= 0; k--) v = (v << 8) | ((bytes[idx[k]!] ?? 0) & 0xff);
  return u32(v);
}

/** Escrita na borda (little-endian). Devolve um novo array; bytes fora do array são descartados. */
export function dmemWrite(bytes: readonly number[], address: number, data: number): number[] {
  const out = bytes.slice();
  dmemByteIndices(address).forEach((i, k) => {
    if (i < out.length) out[i] = (u32(data) >>> (8 * k)) & 0xff;
  });
  return out;
}

/** Palavra little-endian a partir do byte `address` (alinhado), para painéis e testes. */
export function dmemWord(bytes: readonly number[], address: number): number {
  return dmemRead(bytes, address, 1);
}
