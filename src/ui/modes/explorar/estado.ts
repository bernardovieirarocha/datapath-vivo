import { u32 } from '../../../core/bits';
import { assemble, decode, disassemble } from '../../../core/isa';
import { DMEM_BYTES, IMEM_WORDS, type MonoState } from '../../../core/mono';

export type ResultadoInstrucao =
  { ok: true; word: number; texto: string } | { ok: false; erro: string };

/**
 * Lê UMA instrução digitada pelo aluno: Assembly (`lw $t0, 8($s1)`) ou os 32 bits
 * em hex (`0x8D280008`). No beq e no j, só valores numéricos (não há rótulos).
 */
export function lerInstrucao(texto: string): ResultadoInstrucao {
  const t = texto.trim();
  if (t === '') return { ok: false, erro: 'Digite uma instrução, por exemplo: add $8, $17, $18' };
  if (/^0x[0-9a-f]{1,8}$/i.test(t)) {
    const word = u32(parseInt(t, 16));
    const d = decode(word);
    if (!d.ok && word !== 0)
      return { ok: false, erro: `0x${t.slice(2).toUpperCase()}: ${d.reason}` };
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

/** Valor inicial de um registrador que o aluno ainda não mexeu: 4 × número (alinhado, pequeno). */
export const valorPadraoReg = (n: number): number => (n === 0 ? 0 : 4 * n);

/** Valor inicial de uma palavra da memória de dados que o aluno ainda não mexeu. */
export const valorPadraoMem = (endereco: number): number => 1000 + endereco;

/**
 * Monta o estado do processador para "ver" uma instrução: a instrução fica no
 * endereço do PC, os registradores e a memória têm os valores escolhidos (ou os padrões).
 */
export function montarEstado(
  word: number,
  pc: number,
  regs: Readonly<Record<number, number>>,
  mem: Readonly<Record<number, number>>,
): MonoState {
  const imem = new Array<number>(IMEM_WORDS).fill(0);
  const idx = Math.floor(u32(pc) / 4);
  if (idx < IMEM_WORDS) imem[idx] = u32(word);
  const r = Array.from({ length: 32 }, (_, n) => (n === 0 ? 0 : u32(regs[n] ?? valorPadraoReg(n))));
  const dmem = new Array<number>(DMEM_BYTES).fill(0);
  for (let a = 0; a < DMEM_BYTES; a += 4) {
    const w = u32(mem[a] ?? valorPadraoMem(a));
    for (let k = 0; k < 4; k++) dmem[a + k] = (w >>> (8 * k)) & 0xff;
  }
  return { cycle: 0, pc: u32(pc), regs: r, dmem, imem };
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
