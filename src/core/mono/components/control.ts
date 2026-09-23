/** Sinais da unidade de controle principal (`controle_principal.v`). */
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

/** Opcodes reconhecidos pelo `controle_principal.v`. */
export const KNOWN_OPCODES: ReadonlySet<number> = new Set([
  0b000000, 0b001000, 0b100011, 0b101011, 0b000100, 0b000010,
]);

/**
 * Tabela da Seção 2.3. Os "don't care" do slide saem 0 (valor padrão do Verilog).
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
