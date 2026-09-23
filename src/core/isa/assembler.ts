import { u32 } from '../bits';
import { encode } from './encoding';
import { findSpec, type Instruction, type InstructionSpec, type Syntax } from './instructions';
import { parseRegister } from './registers';

/** Tamanho da memória de instruções da Prática 10 (`MemoriaInstrucao.v`): 32 palavras. */
export const IMEM_WORDS = 32;

export interface AsmError {
  /** Linha no texto-fonte, começando em 1. */
  line: number;
  message: string;
}

export interface AsmLine {
  address: number;
  word: number;
  /** Linha no texto-fonte, começando em 1. */
  line: number;
  /** Texto da instrução, sem rótulo nem comentário. */
  source: string;
  /** `null` para `nop`. */
  instr: Instruction | null;
}

export interface Program {
  words: number[];
  lines: AsmLine[];
  labels: Record<string, number>;
}

export type AssembleResult = { ok: true; program: Program } | { ok: false; errors: AsmError[] };

export interface AssembleOptions {
  /** Aceitar bne, slti, jal, jr (Laboratório de Extensão). Padrão: false. */
  extensions?: boolean;
  /** Máximo de instruções. Padrão: 32 (memória de instruções do lab). */
  maxWords?: number;
}

/** Mensagem pronta para mostrar ao aluno: `Linha 3: …`. */
export function formatAsmError(e: AsmError): string {
  return `Linha ${e.line}: ${e.message}`;
}

const HINTS: Record<Syntax, (m: string) => string> = {
  'rd,rs,rt': (m) => `${m} $rd, $rs, $rt`,
  rs: (m) => `${m} $rs`,
  'rt,rs,imm': (m) => `${m} $rt, $rs, imediato`,
  'rt,imm(rs)': (m) => `${m} $rt, deslocamento($rs)`,
  'rs,rt,offset': (m) => `${m} $rs, $rt, rótulo`,
  target: (m) => `${m} rótulo`,
};

const OPERAND_COUNT: Record<Syntax, number> = {
  'rd,rs,rt': 3,
  rs: 1,
  'rt,rs,imm': 3,
  'rt,imm(rs)': 2,
  'rs,rt,offset': 3,
  target: 1,
};

const LABEL_RE = /^([A-Za-z_][\w.]*)\s*:/;
const NUMBER_RE = /^([+-])?(0x[0-9a-f]+|0b[01]+|\d+)$/i;

class LineError extends Error {}

function fail(message: string): never {
  throw new LineError(message);
}

interface Statement {
  line: number;
  text: string;
  address: number;
}

/**
 * Monta um programa em Assembly (subconjunto do hardware da Prática 10).
 *
 * Aceita: rótulos (`loop:`), comentários `#`, registradores `$8`/`$t0`/`$zero`,
 * imediatos decimais, hex (`0x1F`) ou binários (`0b101`), `beq` com rótulo ou
 * deslocamento numérico (em palavras, relativo a PC+4), `j` com rótulo ou
 * endereço numérico (em bytes), e `nop`. O programa começa no endereço 0.
 * Todos os erros são coletados (não para no primeiro).
 */
export function assemble(source: string, opts: AssembleOptions = {}): AssembleResult {
  const maxWords = opts.maxWords ?? IMEM_WORDS;
  const errors: AsmError[] = [];
  const labels: Record<string, number> = {};
  const statements: Statement[] = [];

  // 1ª passada: rótulos e endereços.
  source.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    let text = stripComment(raw).trim();
    let m: RegExpExecArray | null;
    while ((m = LABEL_RE.exec(text))) {
      const name = m[1]!;
      if (Object.hasOwn(labels, name)) {
        errors.push({ line, message: `o rótulo "${name}" já foi definido antes` });
      } else {
        labels[name] = statements.length * 4;
      }
      text = text.slice(m[0].length).trim();
    }
    if (text !== '') statements.push({ line, text, address: statements.length * 4 });
  });

  if (statements.length > maxWords) {
    errors.push({
      line: statements[maxWords]!.line,
      message: `o programa passa de ${maxWords} instruções — a memória de instruções da Prática 10 só tem ${maxWords} palavras`,
    });
  }

  // 2ª passada: codificação.
  const lines: AsmLine[] = [];
  for (const st of statements) {
    try {
      const instr = parseStatement(st, labels, opts.extensions ?? false);
      lines.push({
        address: st.address,
        word: instr ? encode(instr) : 0,
        line: st.line,
        source: st.text,
        instr,
      });
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      errors.push({ line: st.line, message: e.message });
    }
  }

  if (errors.length > 0) {
    errors.sort((a, b) => a.line - b.line);
    return { ok: false, errors };
  }
  return { ok: true, program: { words: lines.map((l) => l.word), lines, labels } };
}

function stripComment(line: string): string {
  const i = line.indexOf('#');
  return i === -1 ? line : line.slice(0, i);
}

function parseStatement(
  st: Statement,
  labels: Record<string, number>,
  extensions: boolean,
): Instruction | null {
  const m = /^(\S+)\s*(.*)$/.exec(st.text)!;
  const mnemonic = m[1]!.toLowerCase();
  const rest = m[2]!.trim();

  if (mnemonic === 'nop') {
    if (rest !== '') fail('nop não tem operandos');
    return null;
  }
  if (mnemonic.startsWith('.')) {
    fail(`diretivas como "${mnemonic}" não são suportadas; escreva só as instruções`);
  }

  const spec = findSpec(mnemonic);
  if (!spec) {
    fail(
      `instrução desconhecida "${m[1]}". O hardware da Prática 10 tem: add, sub, and, or, slt, addi, lw, sw, beq, j`,
    );
  }
  if (!spec.hardware && !extensions) {
    fail(
      `${spec.mnemonic} não existe no processador da Prática 10 — ela é assunto do Laboratório de Extensão`,
    );
  }

  const ops = rest === '' ? [] : rest.split(',').map((s) => s.trim());
  const expected = OPERAND_COUNT[spec.syntax];
  if (ops.length !== expected || ops.some((o) => o === '')) {
    fail(
      `${spec.mnemonic} espera ${expected} operando${expected > 1 ? 's' : ''}; formato: ${HINTS[spec.syntax](spec.mnemonic)}`,
    );
  }
  return build(spec, ops, st.address, labels);
}

function build(
  spec: InstructionSpec,
  ops: string[],
  address: number,
  labels: Record<string, number>,
): Instruction {
  const [a = '', b = '', c = ''] = ops;
  switch (spec.syntax) {
    case 'rd,rs,rt':
      return { mnemonic: spec.mnemonic as 'add', rd: reg(a), rs: reg(b), rt: reg(c) };
    case 'rs':
      return { mnemonic: 'jr', rs: reg(a) };
    case 'rt,rs,imm':
      return { mnemonic: spec.mnemonic as 'addi', rt: reg(a), rs: reg(b), imm: imm16(c) };
    case 'rt,imm(rs)': {
      const mm = /^(.*?)\s*\(\s*([^)]*?)\s*\)$/.exec(b);
      if (!mm) {
        fail(`endereço "${b}" inválido; formato: ${HINTS[spec.syntax](spec.mnemonic)}`);
      }
      const offset = mm[1] === '' ? 0 : imm16(mm[1]!);
      return { mnemonic: spec.mnemonic as 'lw', rt: reg(a), rs: reg(mm[2]!), imm: offset };
    }
    case 'rs,rt,offset':
      return {
        mnemonic: spec.mnemonic as 'beq',
        rs: reg(a),
        rt: reg(b),
        imm: branchOffset(c, address, labels),
      };
    case 'target':
      return { mnemonic: spec.mnemonic as 'j', target: jumpTarget(a, address, labels) };
  }
}

function reg(text: string): number {
  const r = parseRegister(text);
  if (r === undefined) {
    fail(`registrador inválido "${text}" (use $0 a $31 ou nomes como $t0, $s1, $zero)`);
  }
  return r;
}

function parseNumber(text: string): number | undefined {
  const m = NUMBER_RE.exec(text.trim());
  if (!m) return undefined;
  const body = m[2]!.toLowerCase();
  const v = body.startsWith('0b') ? parseInt(body.slice(2), 2) : Number(body);
  return m[1] === '-' ? -v : v;
}

function imm16(text: string): number {
  const v = parseNumber(text);
  if (v === undefined) fail(`imediato inválido "${text}" (use decimal, 0x… ou 0b…)`);
  if (v < -32768 || v > 32767) {
    const hint =
      v >= 0x8000 && v <= 0xffff
        ? `; o imediato tem sinal — para os bits ${text} escreva ${v - 0x10000}`
        : '';
    fail(`imediato ${text} não cabe em 16 bits com sinal (-32768 a 32767)${hint}`);
  }
  return v;
}

function isLabelName(text: string): boolean {
  return /^[A-Za-z_][\w.]*$/.test(text);
}

function branchOffset(text: string, address: number, labels: Record<string, number>): number {
  if (isLabelName(text)) {
    const dest = labels[text];
    if (dest === undefined) fail(`rótulo "${text}" não foi definido`);
    const offset = (dest - (address + 4)) / 4;
    if (offset < -32768 || offset > 32767)
      fail(`o rótulo "${text}" está longe demais para o desvio`);
    return offset;
  }
  const v = parseNumber(text);
  if (v === undefined) fail(`destino do desvio inválido "${text}" (use um rótulo ou um número)`);
  if (v < -32768 || v > 32767) {
    fail(`deslocamento ${text} não cabe em 16 bits com sinal (-32768 a 32767)`);
  }
  return v;
}

function jumpTarget(text: string, address: number, labels: Record<string, number>): number {
  let dest: number;
  if (isLabelName(text)) {
    const d = labels[text];
    if (d === undefined) fail(`rótulo "${text}" não foi definido`);
    dest = d;
  } else {
    const v = parseNumber(text);
    if (v === undefined || v < 0 || v > 0xffffffff) {
      fail(`endereço de salto inválido "${text}" (use um rótulo ou um endereço em bytes)`);
    }
    if (v % 4 !== 0) fail(`endereço de salto ${text} não é múltiplo de 4`);
    dest = v;
  }
  const region = u32(address + 4) & 0xf0000000;
  if ((u32(dest) & 0xf0000000) !== region) {
    fail(`o endereço ${text} está fora da região de 256 MB de PC+4 — o j não alcança`);
  }
  return (u32(dest) >>> 2) & 0x3ffffff;
}
