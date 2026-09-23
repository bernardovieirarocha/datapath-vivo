import { bin, hex, toSigned } from '../core/bits';
import type { WireKind } from '../core/netlist';

export type Formato = 'dec' | 'hex';

/** Valor de um fio no formato escolhido. Dados de 32 bits em decimal saem com sinal. */
export function formatar(value: number, width: number, kind: WireKind, formato: Formato): string {
  if (kind === 'controle' && width > 1) return bin(value, width);
  if (formato === 'hex' || (kind === 'instrucao' && width === 32)) {
    return width === 1 ? String(value) : hex(value, Math.ceil(width / 4));
  }
  if (width === 32 && kind === 'dados') return String(toSigned(value));
  return String(value >>> 0);
}

/** Texto completo (dec com e sem sinal, hex, bin) para o tooltip. */
export function descrever(value: number, width: number): string {
  const partes = [`${value >>> 0}`];
  if (width === 32 && value >= 0x80000000) partes.push(`${toSigned(value)} com sinal`);
  if (width > 1) partes.push(hex(value, Math.ceil(width / 4)));
  if (width > 1) partes.push(`${bin(value, width)}₂`);
  return partes.join(' · ');
}
