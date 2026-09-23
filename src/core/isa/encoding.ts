import { bits, toSigned, u32 } from '../bits';
import { INSTRUCTIONS, specOf, type Instruction, type InstructionSpec } from './instructions';

/** Os campos da instrução exatamente como o `processador.v` fatia `instrucao`. */
export interface Fields {
  opcode: number; // [31:26]
  rs: number; // [25:21]
  rt: number; // [20:16]
  rd: number; // [15:11]
  shamt: number; // [10:6]
  funct: number; // [5:0]
  imm16: number; // [15:0], sem sinal
  target: number; // [25:0]
}

export function fields(word: number): Fields {
  return {
    opcode: bits(word, 31, 26),
    rs: bits(word, 25, 21),
    rt: bits(word, 20, 16),
    rd: bits(word, 15, 11),
    shamt: bits(word, 10, 6),
    funct: bits(word, 5, 0),
    imm16: bits(word, 15, 0),
    target: bits(word, 25, 0),
  };
}

function checkRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} fora da faixa [${min}, ${max}]: ${value}`);
  }
}

function checkReg(name: string, r: number): void {
  checkRange(name, r, 0, 31);
}

/** Codifica uma instrução em 32 bits. Lança `RangeError` se algum campo não couber. */
export function encode(instr: Instruction): number {
  const spec = specOf(instr.mnemonic);
  const op = spec.opcode << 26;
  switch (instr.mnemonic) {
    case 'add':
    case 'sub':
    case 'and':
    case 'or':
    case 'slt':
      checkReg('rd', instr.rd);
      checkReg('rs', instr.rs);
      checkReg('rt', instr.rt);
      return u32(op | (instr.rs << 21) | (instr.rt << 16) | (instr.rd << 11) | spec.funct!);
    case 'jr':
      checkReg('rs', instr.rs);
      return u32(op | (instr.rs << 21) | spec.funct!);
    case 'addi':
    case 'slti':
    case 'lw':
    case 'sw':
    case 'beq':
    case 'bne':
      checkReg('rs', instr.rs);
      checkReg('rt', instr.rt);
      checkRange('imediato', instr.imm, -32768, 32767);
      return u32(op | (instr.rs << 21) | (instr.rt << 16) | (instr.imm & 0xffff));
    case 'j':
    case 'jal':
      checkRange('endereço', instr.target, 0, 0x3ffffff);
      return u32(op | instr.target);
  }
}

export type DecodeResult =
  | { ok: true; instr: Instruction; spec: InstructionSpec; fields: Fields; ignored: string[] }
  | { ok: false; fields: Fields; reason: string };

const R_BY_FUNCT = new Map(INSTRUCTIONS.filter((s) => s.format === 'R').map((s) => [s.funct!, s]));
const BY_OPCODE = new Map(INSTRUCTIONS.filter((s) => s.format !== 'R').map((s) => [s.opcode, s]));

/**
 * Decodifica 32 bits. Reconhece as 14 instruções da tabela (inclusive as de extensão;
 * consulte `spec.hardware`). `ignored` lista campos não nulos que a instrução não usa
 * (ex.: shamt ≠ 0 num add) — o hardware do lab os ignora.
 */
export function decode(word: number): DecodeResult {
  const f = fields(word);
  const spec = f.opcode === 0 ? R_BY_FUNCT.get(f.funct) : BY_OPCODE.get(f.opcode);
  if (!spec) {
    const reason =
      f.opcode === 0
        ? `funct desconhecido: ${f.funct.toString(2).padStart(6, '0')}`
        : `opcode desconhecido: ${f.opcode.toString(2).padStart(6, '0')}`;
    return { ok: false, fields: f, reason };
  }

  const ignored: string[] = [];
  const imm = toSigned(f.imm16 << 16) >> 16;
  let instr: Instruction;
  switch (spec.syntax) {
    case 'rd,rs,rt':
      instr = { mnemonic: spec.mnemonic as 'add', rd: f.rd, rs: f.rs, rt: f.rt };
      if (f.shamt !== 0) ignored.push('shamt');
      break;
    case 'rs':
      instr = { mnemonic: 'jr', rs: f.rs };
      if (f.rt !== 0) ignored.push('rt');
      if (f.rd !== 0) ignored.push('rd');
      if (f.shamt !== 0) ignored.push('shamt');
      break;
    case 'rt,rs,imm':
    case 'rt,imm(rs)':
    case 'rs,rt,offset':
      instr = { mnemonic: spec.mnemonic as 'addi', rs: f.rs, rt: f.rt, imm };
      break;
    case 'target':
      instr = { mnemonic: spec.mnemonic as 'j', target: f.target };
      break;
  }
  return { ok: true, instr, spec, fields: f, ignored };
}
