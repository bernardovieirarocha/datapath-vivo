import { describe, expect, it } from 'vitest';
import { EXEMPLO_INITIAL } from '../../../core/mono';
import { formatEstado, parseEstado } from './estadoInicial';
import { decodeCompartilhado, encodeCompartilhado } from './link';

describe('estado inicial em texto', () => {
  it('lê registradores (número e nome) e palavras de memória little-endian', () => {
    const r = parseEstado('$8 = 5\n$t1 = -1   # comentário\n$12 = 0x10\nM[8] = 0x11223344\n\n');
    expect(r).toEqual({
      ok: true,
      regs: { 8: 5, 9: 0xffffffff, 12: 16 },
      dmemBytes: { 8: 0x44, 9: 0x33, 10: 0x22, 11: 0x11 },
    });
  });

  it('erros com a linha', () => {
    const r = parseEstado(
      '$8 5\n$32 = 1\n$0 = 1\nM[3] = 1\nM[256] = 1\n$8 = abc\n$9 = 0x1FFFFFFFF',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(r.errors[2]!.message).toMatch(/\$0 vale sempre 0/);
      expect(r.errors[3]!.message).toMatch(/múltiplo de 4/);
    }
  });

  it('ida e volta com o estado do programa de exemplo', () => {
    const text = formatEstado(EXEMPLO_INITIAL);
    expect(text).toBe('$8 = 5\n$9 = 5\n$10 = 1\n$12 = 4\nM[0] = 5\nM[8] = 7\n');
    const r = parseEstado(text);
    expect(r.ok && r.regs).toEqual(EXEMPLO_INITIAL.regs);
    expect(r.ok && r.dmemBytes).toMatchObject(EXEMPLO_INITIAL.dmemBytes!);
    expect(formatEstado({})).toBe('');
  });
});

describe('link compartilhável', () => {
  it('ida e volta com acentos e símbolos', () => {
    const c = { programa: 'inicio: beq $8, $9, pula # ação\n', estado: '$8 = -5\n' };
    const data = encodeCompartilhado(c);
    expect(data).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCompartilhado(data)).toEqual(c);
  });
  it('link inválido devolve undefined', () => {
    expect(decodeCompartilhado('%%%')).toBeUndefined();
    expect(
      decodeCompartilhado(encodeCompartilhado({ programa: 'x', estado: 'y' }).slice(0, 5)),
    ).toBeUndefined();
    expect(decodeCompartilhado(btoa('{"p":1}'))).toBeUndefined();
  });
});
