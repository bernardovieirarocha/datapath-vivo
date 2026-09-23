import { u32 } from '../bits';
import { decode } from './encoding';
import { formatRegister, type RegisterStyle } from './registers';

export interface DisassembleOptions {
  /** `$8` (padrão, como no lab) ou `$t0`. */
  registers?: RegisterStyle;
  /**
   * Endereço da instrução. Se dado, o destino do `j`/`jal` inclui PC+4[31:28]
   * (senão, supõe os 4 bits de cima em 0 — o caso de todo programa da Prática 10).
   */
  pc?: number;
}

/**
 * Converte 32 bits em Assembly, no mesmo formato aceito pelo montador:
 * `beq $8, $9, 1`, `sw $8, 0($12)`, `j 0`. A palavra 0x00000000 vira `nop`.
 * Instruções desconhecidas viram um comentário explicando o motivo.
 */
export function disassemble(word: number, opts: DisassembleOptions = {}): string {
  const w = u32(word);
  if (w === 0) return 'nop';
  const d = decode(w);
  if (!d.ok) return `# instrução desconhecida (${d.reason})`;

  const r = (n: number) => formatRegister(n, opts.registers);
  const i = d.instr;
  switch (i.mnemonic) {
    case 'add':
    case 'sub':
    case 'and':
    case 'or':
    case 'slt':
      return `${i.mnemonic} ${r(i.rd)}, ${r(i.rs)}, ${r(i.rt)}`;
    case 'jr':
      return `jr ${r(i.rs)}`;
    case 'addi':
    case 'slti':
      return `${i.mnemonic} ${r(i.rt)}, ${r(i.rs)}, ${i.imm}`;
    case 'lw':
    case 'sw':
      return `${i.mnemonic} ${r(i.rt)}, ${i.imm}(${r(i.rs)})`;
    case 'beq':
    case 'bne':
      return `${i.mnemonic} ${r(i.rs)}, ${r(i.rt)}, ${i.imm}`;
    case 'j':
    case 'jal':
      return `${i.mnemonic} ${jumpAddress(i.target, opts.pc ?? 0)}`;
  }
}

/** Endereço de salto `{PC+4[31:28], target, 00}` (Seção 2.1). */
export function jumpAddress(target: number, pc: number): number {
  return u32((u32(pc + 4) & 0xf0000000) | ((target & 0x3ffffff) << 2));
}
