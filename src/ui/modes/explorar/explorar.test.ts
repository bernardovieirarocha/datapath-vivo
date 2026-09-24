import { describe, expect, it } from 'vitest';
import { toSigned } from '../../../core/bits';
import { step } from '../../../core/mono';
import { narrar } from '../../../content/narracao';
import { formatar } from '../../format';
import { MONO_NETLIST } from '../../../core/mono';
import { ATALHOS, lerInstrucao, lerValor, montarEstado, valorPadraoMem } from './estado';

const WIRE = new Map(MONO_NETLIST.wires.map((w) => [w.id, w]));

function ver(
  texto: string,
  regs: Record<number, number> = {},
  mem: Record<number, number> = {},
  pc = 0,
) {
  const r = lerInstrucao(texto);
  if (!r.ok) throw new Error(r.erro);
  const res = step(montarEstado(r.word, pc, regs, mem));
  const v = (id: string) => {
    const w = WIRE.get(id)!;
    return formatar(res.snapshot.wires[id]!, w.width, w.kind, 'dec');
  };
  return {
    ...res,
    etapas: narrar(res.snapshot, v),
    texto: (f: number) => narrar(res.snapshot, v)[f - 1]!.itens.join(' '),
  };
}

describe('lerInstrucao', () => {
  it('Assembly e hex', () => {
    expect(lerInstrucao('lw $t0, 8($s1)')).toEqual({
      ok: true,
      word: 0x8e280008,
      texto: 'lw $t0, 8($s1)',
    });
    expect(lerInstrucao('  0x8E280008 ')).toEqual({
      ok: true,
      word: 0x8e280008,
      texto: 'lw $8, 8($17)',
    });
    expect(lerInstrucao('0x0')).toEqual({ ok: true, word: 0, texto: 'nop' });
  });
  it('erros em português', () => {
    expect(lerInstrucao('')).toMatchObject({
      ok: false,
      erro: expect.stringMatching(/Digite uma instrução/),
    });
    expect(lerInstrucao('add $8, $9')).toMatchObject({
      ok: false,
      erro: expect.stringMatching(/^Add espera 3 operandos/),
    });
    expect(lerInstrucao('beq $1, $2, fim')).toMatchObject({
      ok: false,
      erro: expect.stringMatching(/Aqui não há rótulos/),
    });
    expect(lerInstrucao('0xFC000000')).toMatchObject({
      ok: false,
      erro: expect.stringMatching(/opcode desconhecido/),
    });
    expect(lerInstrucao('add $1,$2,$3; add $1,$2,$3')).toMatchObject({
      ok: false,
      erro: 'Digite uma instrução só.',
    });
  });
  it('todos os atalhos montam', () => {
    for (const a of ATALHOS) expect(lerInstrucao(a).ok, a).toBe(true);
  });
});

describe('lerValor', () => {
  it('decimal com sinal, hex e binário', () => {
    expect(lerValor('-1')).toBe(0xffffffff);
    expect(lerValor('0x10')).toBe(16);
    expect(lerValor('0b101')).toBe(5);
    expect(lerValor(' 42 ')).toBe(42);
    expect(lerValor('abc')).toBeUndefined();
    expect(lerValor('99999999999')).toBeUndefined();
  });
});

describe('montarEstado + narração', () => {
  it('valores padrão: $n = 4n, M[a] = 1000 + a', () => {
    const r = ver('lw $8, 8($17)');
    expect(r.snapshot.wires['rd1']).toBe(68);
    expect(r.snapshot.wires['alu_result']).toBe(76);
    expect(r.next.regs[8]).toBe(valorPadraoMem(76));
    expect(r.texto(3)).toContain('68 + 8 = 76');
    expect(r.texto(2)).toContain('Read data 2 não é usado');
    expect(ver('sw $8, 8($17)').texto(2)).not.toContain('não é usado');
    expect(r.texto(4)).toContain('M[76] = 1076');
    expect(r.texto(5)).toContain('$8 ← 1076');
  });

  it('valores escolhidos pelo aluno e PC diferente de 0', () => {
    const r = ver('add $8, $17, $18', { 17: 12, 18: 30 }, {}, 40);
    expect(r.next.regs[8]).toBe(42);
    expect(r.texto(1)).toContain('O PC (40)');
    expect(r.texto(1)).toContain('PC + 4 = 44');
    expect(r.texto(2)).toContain('funct 100000');
    expect(r.texto(3)).toContain('12 + 30 = 42');
    expect(r.texto(5)).toContain('RegDst = 1 escolhe rd ($8)');
  });

  it('sw, beq tomado e não tomado, j, addi com negativo, slt', () => {
    expect(ver('sw $8, 8($17)', { 8: 5 }).texto(4)).toContain('gravar $8 = 5 em M[76]');
    const t = ver('beq $17, $18, 3', { 17: 7, 18: 7 }, {}, 8);
    expect(t.texto(3)).toContain('desvio é tomado');
    expect(t.next.pc).toBe(8 + 4 + 12);
    expect(ver('beq $17, $18, 3').texto(3)).toContain('não é tomado');
    const j = ver('j 20');
    expect(j.next.pc).toBe(80);
    expect(j.texto(3)).toContain('ninguém usa');
    expect(j.texto(2)).not.toContain('Banco de Registradores lê');
    const a = ver('addi $8, $17, -5', { 17: 2 });
    expect(toSigned(a.next.regs[8]!)).toBe(-3);
    expect(a.texto(3)).toContain('2 + -3'.replace('-3', '-5'));
    expect(ver('slt $8, $17, $18', { 17: -5 >>> 0, 18: 7 }).next.regs[8]).toBe(1);
  });

  it('destino $0 e opcode desconhecido', () => {
    expect(ver('add $0, $17, $18').texto(5)).toContain('$0');
    const r = step(montarEstado(0xfc000000, 0, {}, {}));
    const e = narrar(r.snapshot, () => '0');
    expect(e[1]!.itens[0]).toContain('não está na tabela');
  });

  it('PC além da memória de instruções: instrução fica fora (lê 0)', () => {
    const s = montarEstado(0x012a4020, 400, {}, {});
    expect(s.imem.every((w) => w === 0)).toBe(true);
  });
});
