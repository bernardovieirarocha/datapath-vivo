import { describe, expect, it } from 'vitest';
import { assemble } from '../../../core/isa';
import { COLUNAS, corrigir, instrucaoAleatoria, opcoes } from './correcao';

const OP = { R: 0, addi: 8, lw: 35, sw: 43, beq: 4, j: 2 };

describe('corrigir', () => {
  it('slide: add → 1 0 0 0 10 0 0 1 (Aula 06, p. 38–39)', () => {
    const resp = ['1', '0', '0', '0', '10', '0', '0', '1', '0'];
    COLUNAS.forEach((s, i) => expect(corrigir(OP.R, s, resp[i]!).status, s).toBe('certo'));
  });
  it("don't care aceita X, 0 ou 1", () => {
    for (const r of ['X', '0', '1']) {
      expect(corrigir(OP.sw, 'RegDst', r)).toEqual({ status: 'certo', dontCare: true });
      expect(corrigir(OP.beq, 'MemtoReg', r)).toEqual({ status: 'certo', dontCare: true });
      expect(corrigir(OP.j, 'ALUSrc', r)).toEqual({ status: 'certo', dontCare: true });
    }
  });
  it('X onde o valor importa é erro', () => {
    expect(corrigir(OP.R, 'RegDst', 'X')).toEqual({
      status: 'errado',
      esperado: '1',
      dontCare: false,
      valor: undefined,
    });
    expect(corrigir(OP.lw, 'ALUOp', 'X')).toMatchObject({ status: 'errado', esperado: '00' });
  });
  it('valor errado traz o valor para simular', () => {
    expect(corrigir(OP.lw, 'MemtoReg', '0')).toEqual({
      status: 'errado',
      esperado: '1',
      dontCare: false,
      valor: 0,
    });
    expect(corrigir(OP.beq, 'ALUOp', '10')).toMatchObject({
      status: 'errado',
      esperado: '01',
      valor: 2,
    });
    expect(corrigir(OP.addi, 'ALUSrc', '1').status).toBe('certo');
  });
  it('opções', () => {
    expect(opcoes('ALUOp')).toEqual(['00', '01', '10', 'X']);
    expect(opcoes('Jump')).toEqual(['0', '1', 'X']);
  });
});

describe('instrucaoAleatoria', () => {
  it('sempre monta e só usa instruções da aula', () => {
    let seed = 7;
    const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32;
    const vistos = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const t = instrucaoAleatoria(rand);
      expect(assemble(t).ok, t).toBe(true);
      vistos.add(t.split(' ')[0]!);
    }
    expect([...vistos].sort()).toEqual([
      'add',
      'addi',
      'and',
      'beq',
      'j',
      'lw',
      'or',
      'slt',
      'sub',
      'sw',
    ]);
  });
});
