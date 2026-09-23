/** Sinais da unidade de controle principal (Aula 06, p. 31–34). */
export interface ControlSignals {
  RegDst: 0 | 1;
  Branch: 0 | 1;
  MemRead: 0 | 1;
  MemtoReg: 0 | 1;
  /** 2 bits: 00 add, 01 sub, 10 funct. */
  ALUOp: number;
  MemWrite: 0 | 1;
  ALUSrc: 0 | 1;
  RegWrite: 0 | 1;
  Jump: 0 | 1;
}

export const CONTROL_SIGNAL_NAMES = [
  'RegDst',
  'Branch',
  'MemRead',
  'MemtoReg',
  'ALUOp',
  'MemWrite',
  'ALUSrc',
  'RegWrite',
  'Jump',
] as const satisfies readonly (keyof ControlSignals)[];

const NOP: ControlSignals = {
  RegDst: 0,
  Branch: 0,
  MemRead: 0,
  MemtoReg: 0,
  ALUOp: 0b00,
  MemWrite: 0,
  ALUSrc: 0,
  RegWrite: 0,
  Jump: 0,
};

/** Opcodes reconhecidos pelo controle principal. */
export const KNOWN_OPCODES: ReadonlySet<number> = new Set([
  0b000000, 0b001000, 0b100011, 0b101011, 0b000100, 0b000010,
]);

/**
 * Tabela do controle principal. Onde o slide tem X (don't care), o simulador
 * precisa de um valor concreto e usa 0; `DONT_CARES` diz quais são X.
 * Opcode desconhecido → tudo 0.
 */
export function control(opcode: number): ControlSignals {
  switch (opcode) {
    case 0b000000: // tipo R
      return { ...NOP, RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: 0b10 };
    case 0b001000: // addi
      return { ...NOP, RegDst: 0, RegWrite: 1, ALUSrc: 1, ALUOp: 0b00 };
    case 0b100011: // lw
      return { ...NOP, RegWrite: 1, ALUSrc: 1, MemRead: 1, MemtoReg: 1, ALUOp: 0b00 };
    case 0b101011: // sw
      return { ...NOP, ALUSrc: 1, MemWrite: 1, ALUOp: 0b00 };
    case 0b000100: // beq
      return { ...NOP, Branch: 1, ALUSrc: 0, ALUOp: 0b01 };
    case 0b000010: // j
      return { ...NOP, Jump: 1, ALUOp: 0b00 };
    default:
      return { ...NOP };
  }
}

/**
 * Sinais que são X (don't care) na tabela do slide (Aula 06, p. 34), por opcode.
 * addi não tem X. Para o j, a tabela segue o P&H (ver docs/DUVIDAS.md).
 */
export const DONT_CARES: Readonly<Record<number, readonly (keyof ControlSignals)[]>> = {
  0b000000: [],
  0b001000: [],
  0b100011: [],
  0b101011: ['RegDst', 'MemtoReg'],
  0b000100: ['RegDst', 'MemtoReg'],
  0b000010: ['RegDst', 'ALUSrc', 'MemtoReg'],
};
