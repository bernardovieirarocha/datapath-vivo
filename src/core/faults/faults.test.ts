import { describe, expect, it } from 'vitest';
import { assemble } from '../isa';
import { exploreState, step } from '../mono';
import { compare, overridesOf, runFaultCases, type Fault } from './index';

/** Quais casos falham com as falhas dadas. */
const falham = (...faults: Fault[]) =>
  runFaultCases(faults)
    .filter((r) => !r.works)
    .map((r) => r.case.id);

const stuck = (wire: Fault['wire'], value: number): Fault => ({ wire, mode: 'stuck', value });

describe('sem falha, tudo funciona', () => {
  it('nenhum caso difere', () => {
    expect(falham()).toEqual([]);
  });
});

describe('perguntas do tipo "e se o sinal X travar?"', () => {
  it('MemtoReg preso em 1: tudo que escreve resultado da ULA no banco falha; lw funciona', () => {
    expect(falham(stuck('MemtoReg', 1))).toEqual(['add', 'sub', 'and', 'or', 'slt', 'addi']);
  });
  it('RegDst preso em 0: só o tipo R falha (escreve em rt)', () => {
    expect(falham(stuck('RegDst', 0))).toEqual(['add', 'sub', 'and', 'or', 'slt']);
    const r = runFaultCases([stuck('RegDst', 0)]).find((x) => x.case.id === 'add')!;
    expect(r.comparison.differences).toEqual([
      { kind: 'reg', expected: { index: 8, value: 42 }, actual: { index: 18, value: 42 } },
    ]);
  });
  it('RegDst preso em 1: lw e addi escrevem no campo rd (aqui, $0)', () => {
    expect(falham(stuck('RegDst', 1))).toEqual(['addi', 'lw']);
  });
  it('ALUSrc preso em 1: tipo R e beq tomado falham; beq não tomado continua certo', () => {
    expect(falham(stuck('ALUSrc', 1))).toEqual(['add', 'sub', 'and', 'or', 'slt', 'beq-t']);
  });
  it('ALUSrc preso em 0: addi, lw e sw usam o registrador em vez do imediato', () => {
    expect(falham(stuck('ALUSrc', 0))).toEqual(['addi', 'lw', 'sw']);
  });
  it('Branch preso em 0 / Zero invertido', () => {
    expect(falham(stuck('Branch', 0))).toEqual(['beq-t']);
    expect(falham({ wire: 'zero', mode: 'invert' })).toEqual(['beq-t', 'beq-n']);
  });
  it('Branch preso em 1: só desvia quando o resultado da ULA dá 0 (nenhum destes casos)', () => {
    expect(falham(stuck('Branch', 1))).toEqual([]);
  });
  it('Jump preso em 0 e em 1', () => {
    expect(falham(stuck('Jump', 0))).toEqual(['j']);
    expect(falham(stuck('Jump', 1))).toEqual([
      'add',
      'sub',
      'and',
      'or',
      'slt',
      'addi',
      'lw',
      'sw',
      'beq-t',
      'beq-n',
    ]);
  });
  it('RegWrite preso em 0 e em 1', () => {
    expect(falham(stuck('RegWrite', 0))).toEqual(['add', 'sub', 'and', 'or', 'slt', 'addi', 'lw']);
    // j: o campo rt do j é 0, então a escrita espúria cai no $0
    expect(falham(stuck('RegWrite', 1))).toEqual(['sw', 'beq-t', 'beq-n']);
  });
  it('MemRead: preso em 0 quebra o lw; preso em 1 não muda nada', () => {
    expect(falham(stuck('MemRead', 0))).toEqual(['lw']);
    expect(falham(stuck('MemRead', 1))).toEqual([]);
  });
  it('MemWrite preso em 1: todo mundo escreve na memória', () => {
    expect(falham(stuck('MemWrite', 1))).toEqual([
      'add',
      'sub',
      'and',
      'or',
      'slt',
      'addi',
      'lw',
      'beq-t',
      'beq-n',
      'j',
    ]);
  });
  it('ALUOp preso em 00: só quem precisa de outra operação falha (add continua certo)', () => {
    expect(falham(stuck('ALUOp', 0b00))).toEqual(['sub', 'and', 'or', 'slt', 'beq-t']);
  });
  it('ALUOp preso em 10: lw/sw/addi passam a depender do "funct" do imediato', () => {
    // no beq não tomado o AND (funct inválido) de 9 e 7 também dá ≠ 0: por acaso continua certo
    expect(falham(stuck('ALUOp', 0b10))).toEqual(['addi', 'lw', 'sw', 'beq-t']);
  });
  it('ALUOp invertido (00 ↔ 11, 01 ↔ 10)', () => {
    expect(overridesOf([{ wire: 'ALUOp', mode: 'invert' }])['ALUOp']!(0b01)).toBe(0b10);
  });
});

describe('compare', () => {
  it('mostra o que mudaria com um valor errado, sem alterar o estado', () => {
    const w = assemble('lw $8, 8($17)');
    if (!w.ok) throw new Error();
    const s = exploreState(w.program.words[0]!, { regs: { 17: 64 }, mem: { 72: 555 } });
    const c = compare(s, overridesOf([stuck('MemRead', 0)]));
    expect(c.differences).toEqual([
      { kind: 'reg', expected: { index: 8, value: 555 }, actual: { index: 8, value: 0 } },
    ]);
    expect(c.correct.next.regs[8]).toBe(555);
    expect(step(s).next.regs[8]).toBe(555);
    // o sinal sobrescrito aparece no snapshot da execução falha
    expect(c.faulty.snapshot.wires['MemRead']).toBe(0);
  });
  it('diferença de memória e de PC', () => {
    const sw = assemble('sw $8, 8($17)');
    if (!sw.ok) throw new Error();
    const c = compare(
      exploreState(sw.program.words[0]!),
      overridesOf([stuck('MemWrite', 0), stuck('Jump', 1)]),
    );
    expect(c.differences.map((d) => d.kind)).toEqual(['mem', 'pc']);
  });
});
