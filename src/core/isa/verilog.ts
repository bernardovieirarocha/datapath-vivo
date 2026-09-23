import { hex, u32 } from '../bits';
import { IMEM_WORDS } from './assembler';
import { disassemble } from './disassembler';

export interface VerilogImportError {
  line: number;
  message: string;
}

export type VerilogImportResult =
  { ok: true; words: number[] } | { ok: false; errors: VerilogImportError[] };

const ASSIGN_RE = /memory\s*\[\s*(\d+)\s*\]\s*=\s*([^;]*);/g;
const LITERAL_RE = /^(?:32)?'([hbd])([0-9a-fA-F_xXzZ]+)$/;

/**
 * Lê o bloco `memory[i] = 32'h...;` do `MemoriaInstrucao.v` (aceita também `'b` e `'d`).
 * Ignora todo o resto (comentários, `for`, `initial`), como o aluno colaria do Quartus.
 * Devolve as 32 palavras da memória, com zeros onde não houve atribuição.
 * Se o mesmo índice aparece duas vezes, vale a última (como no Verilog).
 */
export function importVerilog(text: string, size = IMEM_WORDS): VerilogImportResult {
  const words = new Array<number>(size).fill(0);
  const errors: VerilogImportError[] = [];
  let found = 0;

  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const code = raw.replace(/\/\/.*$/, '');
    for (const m of code.matchAll(ASSIGN_RE)) {
      const index = Number(m[1]);
      const literal = m[2]!.trim();
      if (index >= size) {
        errors.push({ line, message: `memory[${index}] está fora da memória (0 a ${size - 1})` });
        continue;
      }
      const value = parseLiteral(literal);
      if (value === undefined) {
        errors.push({
          line,
          message: `valor "${literal}" não é um literal de 32 bits (ex.: 32'h11090001)`,
        });
        continue;
      }
      words[index] = value;
      found++;
    }
  });

  if (errors.length === 0 && found === 0) {
    errors.push({
      line: 1,
      message: "nenhuma linha no formato memory[i] = 32'h...; foi encontrada",
    });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, words };
}

function parseLiteral(literal: string): number | undefined {
  const m = LITERAL_RE.exec(literal);
  if (!m) return undefined;
  const digits = m[2]!.replace(/_/g, '');
  if (/[xz]/i.test(digits)) return undefined;
  const base = m[1] === 'h' ? 16 : m[1] === 'b' ? 2 : 10;
  const valid = base === 16 ? /^[0-9a-f]+$/i : base === 2 ? /^[01]+$/ : /^\d+$/;
  if (!valid.test(digits)) return undefined;
  const v = base === 10 ? Number(digits) : parseInt(digits, base);
  return v <= 0xffffffff ? u32(v) : undefined;
}

export interface VerilogExportOptions {
  /** Comentário de cada palavra (ex.: o Assembly original com rótulos). Padrão: disassembly. */
  comments?: (string | undefined)[];
  /** Indentação de cada linha. Padrão: 8 espaços, como em `MemoriaInstrucao.v`. */
  indent?: string;
}

/**
 * Gera as linhas para colar no `initial` do `MemoriaInstrucao.v`, no mesmo estilo do arquivo:
 *
 *     // Endereço 0: beq $8, $9, 1
 *     memory[0] = 32'h11090001;
 */
export function exportVerilog(words: readonly number[], opts: VerilogExportOptions = {}): string {
  const indent = opts.indent ?? '        ';
  return words
    .map((w, i) => {
      const comment = opts.comments?.[i] ?? disassemble(w, { pc: i * 4 });
      const lit = hex(w).slice(2);
      return `${indent}// Endereço ${i * 4}: ${comment}\n${indent}memory[${i}] = 32'h${lit};`;
    })
    .join('\n\n');
}
