import { u32 } from '../../../core/bits';
import { parseRegister } from '../../../core/isa';
import { DMEM_BYTES, type InitialState } from '../../../core/mono';

export interface ErroEstado {
  line: number;
  message: string;
}

export type ResultadoEstado =
  | { ok: true; regs: Record<number, number>; dmemBytes: Record<number, number> }
  | { ok: false; errors: ErroEstado[] };

const NUM = /^([+-])?(0x[0-9a-f]+|0b[01]+|\d+)$/i;

function numero(text: string): number | undefined {
  const m = NUM.exec(text.trim());
  if (!m) return undefined;
  const body = m[2]!.toLowerCase();
  const v = body.startsWith('0b') ? parseInt(body.slice(2), 2) : Number(body);
  return m[1] === '-' ? -v : v;
}

/**
 * Lê o estado inicial escrito pelo aluno, uma atribuição por linha:
 * `$8 = 5`, `$t0 = -3`, `$12 = 0x10`, `M[8] = 7` (palavra de 32 bits, little-endian).
 * Comentários com `#`. Valores aceitam de −2³¹ a 2³² − 1.
 */
export function parseEstado(text: string): ResultadoEstado {
  const regs: Record<number, number> = {};
  const dmemBytes: Record<number, number> = {};
  const errors: ErroEstado[] = [];

  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const code = raw.replace(/#.*$/, '').trim();
    if (code === '') return;
    const m = /^(.+?)\s*=\s*(.+)$/.exec(code);
    if (!m) {
      errors.push({ line, message: 'use o formato "$8 = 5" ou "M[8] = 7"' });
      return;
    }
    const alvo = m[1]!.trim();
    const valor = numero(m[2]!);
    if (valor === undefined || valor < -(2 ** 31) || valor > 0xffffffff) {
      errors.push({ line, message: `valor inválido "${m[2]!.trim()}" (inteiro de 32 bits)` });
      return;
    }
    const mem = /^M\s*\[\s*(.+?)\s*\]$/i.exec(alvo);
    if (mem) {
      const addr = numero(mem[1]!);
      if (addr === undefined || addr < 0 || addr % 4 !== 0 || addr + 3 >= DMEM_BYTES) {
        errors.push({
          line,
          message: `endereço "${mem[1]}" inválido: use um múltiplo de 4 entre 0 e ${DMEM_BYTES - 4}`,
        });
        return;
      }
      const w = u32(valor);
      for (let k = 0; k < 4; k++) dmemBytes[addr + k] = (w >>> (8 * k)) & 0xff;
      return;
    }
    const r = parseRegister(alvo);
    if (r === undefined) {
      errors.push({
        line,
        message: `"${alvo}" não é registrador ($0 a $31, $t0…) nem M[endereço]`,
      });
      return;
    }
    if (r === 0) {
      errors.push({ line, message: '$0 vale sempre 0 e não pode ser inicializado' });
      return;
    }
    regs[r] = u32(valor);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, regs, dmemBytes };
}

/** Escreve um estado inicial no mesmo formato (registradores, depois palavras não nulas). */
export function formatEstado(init: Pick<InitialState, 'regs' | 'dmemBytes'>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(init.regs ?? {}).sort((a, b) => +a[0] - +b[0])) {
    lines.push(`$${k} = ${v | 0}`);
  }
  const words = new Map<number, number>();
  for (const [k, v] of Object.entries(init.dmemBytes ?? {})) {
    const i = Number(k);
    const base = i & ~3;
    words.set(base, u32((words.get(base) ?? 0) | ((v & 0xff) << (8 * (i - base)))));
  }
  for (const [addr, w] of [...words].sort((a, b) => a[0] - b[0])) {
    if (w !== 0) lines.push(`M[${addr}] = ${w | 0}`);
  }
  return lines.join('\n') + (lines.length > 0 ? '\n' : '');
}
