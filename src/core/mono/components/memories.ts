import { u32 } from '../../bits';

/** Memória de instruções simulada: 64 palavras (256 bytes), a partir do endereço 0. */
export const IMEM_WORDS = 64;

/** Memória de dados simulada: 256 bytes (64 palavras), a partir do endereço 0. */
export const DMEM_BYTES = 256;

/** Palavra lida pela memória de instruções. Fora da memória simulada lê 0. */
export function imemRead(imem: readonly number[], pc: number): number {
  return u32(imem[Math.floor(u32(pc) / 4)] ?? 0);
}

/**
 * Endereço efetivo da palavra: os 2 bits de baixo são ignorados (no MIPS real,
 * acesso desalinhado gera exceção; o simulador alinha e avisa).
 */
export function wordAddress(address: number): number {
  return u32(address & ~3);
}

/** `true` se a palavra inteira cabe na memória de dados simulada. */
export function inDmem(address: number): boolean {
  return wordAddress(address) + 3 < DMEM_BYTES;
}

/**
 * Leitura combinacional, little-endian (byte do menor endereço = bits 7..0).
 * MemRead = 0 → 0. Fora da memória simulada → 0 (o simulador gera alerta).
 */
export function dmemRead(bytes: readonly number[], address: number, memRead: number): number {
  if ((memRead & 1) === 0 || !inDmem(address)) return 0;
  const base = wordAddress(address);
  let v = 0;
  for (let k = 3; k >= 0; k--) v = (v << 8) | ((bytes[base + k] ?? 0) & 0xff);
  return u32(v);
}

/** Escrita na borda (little-endian). Devolve um novo array; fora da memória, nada muda. */
export function dmemWrite(bytes: readonly number[], address: number, data: number): number[] {
  const out = bytes.slice();
  if (!inDmem(address)) return out;
  const base = wordAddress(address);
  for (let k = 0; k < 4; k++) out[base + k] = (u32(data) >>> (8 * k)) & 0xff;
  return out;
}

/** Palavra little-endian a partir do byte `address`, para painéis e testes. */
export function dmemWord(bytes: readonly number[], address: number): number {
  return dmemRead(bytes, address, 1);
}
