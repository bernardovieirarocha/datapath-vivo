import { beforeEach, describe, expect, it } from 'vitest';
import { EXEMPLOS } from '../../../content/exemplos';
import { atual, NUM_FASES, useExecucao } from './store';

const s = () => useExecucao.getState();
const padrao = EXEMPLOS[0]!;

beforeEach(() => {
  s().setEmFases(false);
  expect(s().carregar(padrao.programa, padrao.estado)).toBe(true);
});

describe('store do modo Execução', () => {
  it('carrega o programa de exemplo no ciclo 0', () => {
    expect(s().cursor).toBe(0);
    expect(atual(s()).estado.pc).toBe(0);
    expect(atual(s()).resultado.snapshot.wires['instr']).toBe(0x11090001);
    expect(s().linhas).toHaveLength(6);
  });

  it('passo e voltar percorrem o histórico (mesmos PCs do golden trace)', () => {
    const pcs = [atual(s()).estado.pc];
    for (let i = 0; i < 5; i++) {
      s().passo();
      pcs.push(atual(s()).estado.pc);
    }
    expect(pcs).toEqual([0, 8, 12, 16, 20, 0]);
    s().voltar();
    s().voltar();
    expect(atual(s()).estado.pc).toBe(16);
    expect(s().history).toHaveLength(6);
    s().passo();
    expect(s().history).toHaveLength(6); // reaproveita o histórico
    s().reiniciar();
    expect(s().cursor).toBe(0);
    s().voltar();
    expect(s().cursor).toBe(0);
  });

  it('em fases: 5 passos por ciclo, voltar desfaz fase', () => {
    s().setEmFases(true);
    expect(s().fase).toBe(1);
    for (let i = 1; i < NUM_FASES; i++) s().passo();
    expect(s().fase).toBe(NUM_FASES);
    expect(s().cursor).toBe(0);
    s().passo();
    expect(s().cursor).toBe(1);
    expect(s().fase).toBe(1);
    s().voltar();
    expect(s().cursor).toBe(0);
    expect(s().fase).toBe(NUM_FASES);
    s().voltar();
    expect(s().fase).toBe(NUM_FASES - 1);
  });

  it('ir para o ciclo N', () => {
    s().irPara(11);
    expect(s().cursor).toBe(11);
    expect(atual(s()).estado.regs[8]).toBe(5);
    s().irPara(3);
    expect(atual(s()).estado.pc).toBe(16);
    s().irPara(-2);
    expect(s().cursor).toBe(0);
  });

  it('erros de montagem ou de estado não trocam o programa carregado', () => {
    const antes = s().history;
    expect(s().carregar('foo $1', '$8 = 1')).toBe(false);
    expect(s().asmErrors).toHaveLength(1);
    expect(s().carregar('add $1, $2, $3', '$99 = 1')).toBe(false);
    expect(s().estadoErrors).toHaveLength(1);
    expect(s().history).toBe(antes);
  });

  it('breakpoints, formato, seleção e velocidade', () => {
    s().alternarBreakpoint(8);
    s().alternarBreakpoint(12);
    s().alternarBreakpoint(8);
    expect(s().breakpoints).toEqual([12]);
    s().setFormato('hex');
    s().selecionar('alu');
    s().setVelocidade(5);
    s().setRodando(true);
    expect(s()).toMatchObject({ formato: 'hex', selecionado: 'alu', velocidade: 5, rodando: true });
    s().reiniciar();
    expect(s().rodando).toBe(false);
  });
});
