/**
 * Tabela de instruções (docs/PLANO.md, Seção 2.2).
 * `hardware: true` = existe no processador da Prática 10.
 * `hardware: false` = subconjunto de AOC1 que o lab não tem (Laboratório de Extensão, M8).
 */

export type Format = 'R' | 'I' | 'J';

/** Como os operandos aparecem no Assembly. */
export type Syntax =
  | 'rd,rs,rt' // add, sub, and, or, slt
  | 'rs' // jr
  | 'rt,rs,imm' // addi, slti
  | 'rt,imm(rs)' // lw, sw
  | 'rs,rt,offset' // beq, bne
  | 'target'; // j, jal

export interface InstructionSpec {
  mnemonic: Mnemonic;
  format: Format;
  opcode: number;
  /** Só para o formato R. */
  funct?: number;
  syntax: Syntax;
  hardware: boolean;
}

export type RMnemonic = 'add' | 'sub' | 'and' | 'or' | 'slt';
export type Mnemonic =
  RMnemonic | 'jr' | 'addi' | 'slti' | 'lw' | 'sw' | 'beq' | 'bne' | 'j' | 'jal';

// prettier-ignore
export const INSTRUCTIONS: readonly InstructionSpec[] = [
  { mnemonic: 'add', format: 'R', opcode: 0b000000, funct: 0b100000, syntax: 'rd,rs,rt', hardware: true },
  { mnemonic: 'sub', format: 'R', opcode: 0b000000, funct: 0b100010, syntax: 'rd,rs,rt', hardware: true },
  { mnemonic: 'and', format: 'R', opcode: 0b000000, funct: 0b100100, syntax: 'rd,rs,rt', hardware: true },
  { mnemonic: 'or', format: 'R', opcode: 0b000000, funct: 0b100101, syntax: 'rd,rs,rt', hardware: true },
  { mnemonic: 'slt', format: 'R', opcode: 0b000000, funct: 0b101010, syntax: 'rd,rs,rt', hardware: true },
  { mnemonic: 'addi', format: 'I', opcode: 0b001000, syntax: 'rt,rs,imm', hardware: true },
  { mnemonic: 'lw', format: 'I', opcode: 0b100011, syntax: 'rt,imm(rs)', hardware: true },
  { mnemonic: 'sw', format: 'I', opcode: 0b101011, syntax: 'rt,imm(rs)', hardware: true },
  { mnemonic: 'beq', format: 'I', opcode: 0b000100, syntax: 'rs,rt,offset', hardware: true },
  { mnemonic: 'j', format: 'J', opcode: 0b000010, syntax: 'target', hardware: true },
  // Extensão (não existem no hardware do lab)
  { mnemonic: 'bne', format: 'I', opcode: 0b000101, syntax: 'rs,rt,offset', hardware: false },
  { mnemonic: 'slti', format: 'I', opcode: 0b001010, syntax: 'rt,rs,imm', hardware: false },
  { mnemonic: 'jal', format: 'J', opcode: 0b000011, syntax: 'target', hardware: false },
  { mnemonic: 'jr', format: 'R', opcode: 0b000000, funct: 0b001000, syntax: 'rs', hardware: false },
];

const BY_MNEMONIC = new Map(INSTRUCTIONS.map((s) => [s.mnemonic, s]));

export function specOf(mnemonic: Mnemonic): InstructionSpec {
  // Mnemonic é um tipo fechado: toda chave existe na tabela.
  return BY_MNEMONIC.get(mnemonic)!;
}

export function findSpec(mnemonic: string): InstructionSpec | undefined {
  return BY_MNEMONIC.get(mnemonic.toLowerCase() as Mnemonic);
}

/** Instrução já decodificada (valores dos campos; `imm` com sinal, em [-32768, 32767]). */
export type Instruction =
  | { mnemonic: RMnemonic; rd: number; rs: number; rt: number }
  | { mnemonic: 'jr'; rs: number }
  | { mnemonic: 'addi' | 'slti' | 'lw' | 'sw'; rt: number; rs: number; imm: number }
  /** `imm` = offset em palavras relativo a PC+4. */
  | { mnemonic: 'beq' | 'bne'; rs: number; rt: number; imm: number }
  /** `target` = campo de 26 bits (endereço da palavra, sem os 2 zeros e sem PC+4[31:28]). */
  | { mnemonic: 'j' | 'jal'; target: number };
