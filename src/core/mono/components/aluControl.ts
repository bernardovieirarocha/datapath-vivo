/**
 * Controle da ULA (Aula 06, p. 27–30): ALUOp 00 → add (lw/sw/addi), 01 → sub (beq),
 * 10 → o campo funct decide. Escrito como equações por bit (como o circuito
 * combinacional do slide); casos fora da tabela (ALUOp = 11, funct desconhecido) → 000.
 */
export function aluControl(aluOp: number, funct: number): number {
  const isR = aluOp === 0b10;
  const opAdd = aluOp === 0b00 || (isR && funct === 0b100000);
  const opSub = aluOp === 0b01 || (isR && funct === 0b100010);
  // AND = 000 não liga nenhum bit, então não aparece nas equações.
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
