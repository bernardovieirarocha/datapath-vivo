/**
 * `aluControl.v`, pelas mesmas equações do Verilog (não por tabela), para ficar
 * bit-exato também nos casos fora da tabela (ALUOp = 11, funct desconhecido → 000).
 */
export function aluControl(aluOp: number, funct: number): number {
  const isR = aluOp === 0b10;
  const opAdd = aluOp === 0b00 || (isR && funct === 0b100000);
  const opSub = aluOp === 0b01 || (isR && funct === 0b100010);
  // op_and existe no Verilog, mas AND = 000 não liga nenhum bit de alu_op.
  const opOr = isR && funct === 0b100101;
  const opSlt = isR && funct === 0b101010;
  const b2 = opSub || opSlt ? 1 : 0;
  const b1 = opAdd || opSub || opSlt ? 1 : 0;
  const b0 = opOr || opSlt ? 1 : 0;
  return (b2 << 2) | (b1 << 1) | b0;
}

/** Funct reconhecidos pelo controle da ULA quando ALUOp = 10. */
export const KNOWN_FUNCTS: ReadonlySet<number> = new Set([
  0b100000, 0b100010, 0b100100, 0b100101, 0b101010,
]);
