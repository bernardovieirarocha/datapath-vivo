import { hex, u32 } from '../../../core/bits';
import { assemble, decode, disassemble } from '../../../core/isa';
import { exploreState, type MonoState } from '../../../core/mono';

export type ResultadoInstrucao =
  { ok: true; word: number; texto: string } | { ok: false; erro: string };

/**
 * Lê UMA instrução digitada pelo aluno: Assembly (`lw $t0, 8($s1)`) ou os 32 bits
 * em hex (`0x8D280008`) ou binário (`0b…`, ou 32 dígitos 0/1 com espaços opcionais). No beq e no j, só valores numéricos (não há rótulos).
 */
export function lerInstrucao(texto: string): ResultadoInstrucao {
  const t = texto.trim();
  if (t === '') return { ok: false, erro: 'Digite uma instrução, por exemplo: add $8, $17, $18' };
  const soBits = t.replace(/^0b/i, '').replace(/[\s_]/g, '');
  const ehBin = /^[01]+$/.test(soBits) && (soBits.length === 32 || /^0b/i.test(t));
  if (/^0x[0-9a-f]{1,8}$/i.test(t) || (ehBin && soBits.length <= 32)) {
    const word = u32(ehBin ? parseInt(soBits, 2) : parseInt(t, 16));
    const d = decode(word);
    if (!d.ok && word !== 0) return { ok: false, erro: `${hex(word)}: ${d.reason}` };
    if (d.ok && !d.spec.base) {
      return {
        ok: false,
        erro: `${hex(word)} é ${disassemble(word)}, que não faz parte do datapath da aula.`,
      };
    }
    return { ok: true, word, texto: disassemble(word) };
  }
  if (/[\n;]/.test(t)) return { ok: false, erro: 'Digite uma instrução só.' };
  const r = assemble(t);
  if (!r.ok) {
    const e = r.errors[0]!.message;
    const dica = /rótulo ".*" não foi definido/.test(e)
      ? ' Aqui não há rótulos: use um número (beq: deslocamento em instruções; j: valor do campo).'
      : '';
    return { ok: false, erro: e.charAt(0).toUpperCase() + e.slice(1) + '.' + dica };
  }
  const word = r.program.words[0]!;
  return { ok: true, word, texto: t.replace(/\s*#.*$/, '').replace(/\s+/g, ' ') };
}

/** Monta o estado para ver uma instrução (a instrução fica no endereço do PC). */
export function montarEstado(
  word: number,
  pc: number,
  regs: Readonly<Record<number, number>>,
  mem: Readonly<Record<number, number>>,
): MonoState {
  return exploreState(word, { pc, regs, mem });
}

/** Lê um número digitado num campo de valor (decimal com sinal, 0x…, 0b…). */
export function lerValor(texto: string): number | undefined {
  const m = /^\s*([+-])?(0x[0-9a-f]+|0b[01]+|\d+)\s*$/i.exec(texto);
  if (!m) return undefined;
  const body = m[2]!.toLowerCase();
  const v = body.startsWith('0b') ? parseInt(body.slice(2), 2) : Number(body);
  const s = m[1] === '-' ? -v : v;
  return s < -(2 ** 31) || s > 0xffffffff ? undefined : u32(s);
}

/** Exemplos rápidos (um por instrução da aula). */
export const ATALHOS: readonly string[] = [
  'add $8, $17, $18',
  'sub $8, $17, $18',
  'and $8, $17, $18',
  'or $8, $17, $18',
  'slt $8, $17, $18',
  'addi $8, $17, -5',
  'lw $8, 8($17)',
  'sw $8, 8($17)',
  'beq $17, $18, 3',
  'j 96',
];
