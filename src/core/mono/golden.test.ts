/**
 * Teste de regressão nº 1 (regra 2 do CLAUDE.md): o golden trace nunca quebra.
 * 22 ciclos do programa de exemplo, todos os fios, campo a campo.
 */
import { describe, expect, it } from 'vitest';
import golden from '../../../reference/golden_trace_pratica10.json';
import { bin, hex, toSigned } from '../bits';
import { disassemble } from '../isa';
import { createState, EXEMPLO_INITIAL, EXEMPLO_PROGRAM } from './state';
import { run } from './step';
import { dmemWord } from './components';

type GoldenCycle = (typeof golden.trace)[number];

/** Fios de dados: o golden guarda com sinal. */
const SIGNED = [
  'rd1',
  'rd2',
  'imm_ext',
  'alu_b',
  'alu_result',
  'mem_read_data',
  'write_data',
] as const;
/** Endereços e bits: o golden guarda sem sinal. */
const UNSIGNED = [
  'pc',
  'zero',
  'pcsrc',
  'write_reg',
  'pc_plus_4',
  'branch_target',
  'jump_target',
  'next_pc',
] as const;
const CONTROL_1BIT = [
  'RegDst',
  'Branch',
  'MemRead',
  'MemtoReg',
  'MemWrite',
  'ALUSrc',
  'RegWrite',
  'Jump',
] as const;

describe('golden trace do programa de exemplo', () => {
  it('estado inicial e programa batem com o arquivo', () => {
    const init = golden.initial_state;
    expect(EXEMPLO_PROGRAM).toEqual(golden.program.map((p) => Number(p.hex)));
    expect(EXEMPLO_INITIAL.regs).toEqual(
      Object.fromEntries(Object.entries(init.regs).map(([k, v]) => [Number(k), v])),
    );
    expect(EXEMPLO_INITIAL.dmemBytes).toEqual(
      Object.fromEntries(Object.entries(init.dmem_bytes).map(([k, v]) => [Number(k), v])),
    );
    expect(createState(EXEMPLO_INITIAL).pc).toBe(init.pc);
    expect(golden.trace).toHaveLength(22);
  });

  const { states, snapshots } = run(createState(EXEMPLO_INITIAL), golden.trace.length);

  describe.each(golden.trace.map((g, i) => [g.cycle, g.asm, g, i] as const))(
    'ciclo %i (%s)',
    (_cycle, _asm, g: GoldenCycle, i) => {
      const snap = snapshots[i]!;
      const after = states[i + 1]!;
      const w = snap.wires;

      it('instrução', () => {
        expect(snap.cycle).toBe(g.cycle);
        expect(hex(w['instr']!)).toBe(g.instr.toUpperCase().replace('0X', '0x'));
        expect(disassemble(w['instr']!)).toBe(g.asm);
      });

      it('sinais de controle', () => {
        for (const s of CONTROL_1BIT) expect(w[s], s).toBe(g.control[s]);
        expect(bin(w['ALUOp']!, 2)).toBe(g.control.ALUOp);
        expect(bin(w['alu_ctl']!, 3)).toBe(g.alu_ctl);
      });

      it('fios de dados (com sinal)', () => {
        for (const f of SIGNED) expect(toSigned(w[f]!), f).toBe(g[f]);
      });

      it('fios de endereço e 1 bit (sem sinal)', () => {
        for (const f of UNSIGNED) expect(w[f], f).toBe(g[f]);
      });

      it('estado depois da borda', () => {
        expect(after.pc).toBe(g.next_pc);
        expect(after.regs[8]).toBe(g.after.reg8);
        expect(after.regs[9]).toBe(g.after.reg9);
        expect(after.regs[10]).toBe(g.after.reg10);
        expect(after.regs[12]).toBe(g.after.reg12);
        expect(after.regs[16]).toBe(g.after.reg16);
        expect(toSigned(dmemWord(after.dmem, 4))).toBe(g.after.mem_word_4);
      });

      it('nenhum alerta no programa de exemplo', () => {
        expect(snap.alerts).toEqual([]);
      });
    },
  );
});
