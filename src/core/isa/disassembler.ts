import { u32 } from '../bits';
import { decode } from './encoding';
import { formatRegister, type RegisterStyle } from './registers';

export interface DisassembleOptions {
  /** `$8` (padrão, como nos slides) ou `$t0`. */
  registers?: RegisterStyle;
}

/**
 * Converte 32 bits em Assembly, no mesmo formato aceito pelo montador:
 * `beq $8, $9, 1`, `sw $8, 0($12)`, `j 96` (valor do campo, como no slide).
 * A palavra 0x00000000 vira `nop`.
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
      return `${i.mnemonic} ${i.target}`;
  }
}

/** Endereço de salto `{PC+4[31:28], target, 00}` (Aula 06, inclusão do jump). */
export function jumpAddress(target: number, pc: number): number {
  return u32((u32(pc + 4) & 0xf0000000) | ((target & 0x3ffffff) << 2));
}
