/**
 * Tabela de instruções (docs/PLANO.md, Seção 2.2).
 * `base: true` = instrução do datapath ensinado em aula (Aula 06; addi incluída).
 * `base: false` = instruções que o datapath da aula não tem (Laboratório de Extensão, M8).
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
  base: boolean;
}

export type RMnemonic = 'add' | 'sub' | 'and' | 'or' | 'slt';
export type Mnemonic =
  RMnemonic | 'jr' | 'addi' | 'slti' | 'lw' | 'sw' | 'beq' | 'bne' | 'j' | 'jal';

// prettier-ignore
export const INSTRUCTIONS: readonly InstructionSpec[] = [
  { mnemonic: 'add', format: 'R', opcode: 0b000000, funct: 0b100000, syntax: 'rd,rs,rt', base: true },
  { mnemonic: 'sub', format: 'R', opcode: 0b000000, funct: 0b100010, syntax: 'rd,rs,rt', base: true },
  { mnemonic: 'and', format: 'R', opcode: 0b000000, funct: 0b100100, syntax: 'rd,rs,rt', base: true },
  { mnemonic: 'or', format: 'R', opcode: 0b000000, funct: 0b100101, syntax: 'rd,rs,rt', base: true },
  { mnemonic: 'slt', format: 'R', opcode: 0b000000, funct: 0b101010, syntax: 'rd,rs,rt', base: true },
  { mnemonic: 'addi', format: 'I', opcode: 0b001000, syntax: 'rt,rs,imm', base: true },
  { mnemonic: 'lw', format: 'I', opcode: 0b100011, syntax: 'rt,imm(rs)', base: true },
  { mnemonic: 'sw', format: 'I', opcode: 0b101011, syntax: 'rt,imm(rs)', base: true },
  { mnemonic: 'beq', format: 'I', opcode: 0b000100, syntax: 'rs,rt,offset', base: true },
  { mnemonic: 'j', format: 'J', opcode: 0b000010, syntax: 'target', base: true },
  // Extensão (não existem no datapath da aula)
  { mnemonic: 'bne', format: 'I', opcode: 0b000101, syntax: 'rs,rt,offset', base: false },
  { mnemonic: 'slti', format: 'I', opcode: 0b001010, syntax: 'rt,rs,imm', base: false },
  { mnemonic: 'jal', format: 'J', opcode: 0b000011, syntax: 'target', base: false },
  { mnemonic: 'jr', format: 'R', opcode: 0b000000, funct: 0b001000, syntax: 'rs', base: false },
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
