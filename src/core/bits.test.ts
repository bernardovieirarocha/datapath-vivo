import { describe, expect, it } from 'vitest';
import { bin, bit, bits, hex, mask, signExt16, toSigned, u32 } from './bits';

describe('u32', () => {
  it('mantém valores já sem sinal', () => {
    expect(u32(0)).toBe(0);
    expect(u32(5)).toBe(5);
    expect(u32(0xffffffff)).toBe(0xffffffff);
  });
  it('reinterpreta negativos em complemento de 2', () => {
    expect(u32(-1)).toBe(0xffffffff);
    expect(u32(-(2 ** 31))).toBe(0x80000000);
  });
  it('dá a volta em 2^32 (overflow do somador)', () => {
    expect(u32(0xffffffff + 1)).toBe(0);
    expect(u32(0xfffffffc + 8)).toBe(4);
  });
  it('resultados de operadores bit a bit viram sem sinal', () => {
    expect(u32(~0)).toBe(0xffffffff);
    expect(u32(1 << 31)).toBe(0x80000000);
  });
});

describe('toSigned', () => {
  it('interpreta o bit 31 como sinal', () => {
    expect(toSigned(0xffffffff)).toBe(-1);
    expect(toSigned(0x80000000)).toBe(-(2 ** 31));
    expect(toSigned(0x7fffffff)).toBe(2 ** 31 - 1);
    expect(toSigned(4)).toBe(4);
  });
  it('é o inverso de u32', () => {
    for (const x of [0, 1, -1, 123456, -123456, 2 ** 31 - 1, -(2 ** 31)]) {
      expect(toSigned(u32(x))).toBe(x);
    }
  });
});

describe('signExt16', () => {
  it('positivos ficam iguais', () => {
    expect(signExt16(0x0001)).toBe(1);
    expect(signExt16(0x7fff)).toBe(0x00007fff);
  });
  it('negativos replicam o bit 15', () => {
    expect(signExt16(0xffff)).toBe(0xffffffff);
    expect(signExt16(0x8000)).toBe(0xffff8000);
    expect(toSigned(signExt16(0xfffe))).toBe(-2);
  });
  it('ignora bits acima do 15 (só a fatia imm16 entra no bloco)', () => {
    expect(signExt16(0x11090001)).toBe(1);
    expect(signExt16(0x1234ffff)).toBe(0xffffffff);
  });
});

describe('mask', () => {
  it('gera máscaras de 0 a 32 bits', () => {
    expect(mask(0)).toBe(0);
    expect(mask(1)).toBe(1);
    expect(mask(5)).toBe(0x1f);
    expect(mask(31)).toBe(0x7fffffff);
    expect(mask(32)).toBe(0xffffffff);
  });
  it('rejeita larguras inválidas', () => {
    expect(() => mask(-1)).toThrow(RangeError);
    expect(() => mask(33)).toThrow(RangeError);
    expect(() => mask(1.5)).toThrow(RangeError);
  });
});

describe('bits', () => {
  // beq $8, $9, 1 = 0x11090001
  const beq = 0x11090001;
  it('extrai os campos da instrução como no Verilog', () => {
    expect(bits(beq, 31, 26)).toBe(0b000100); // opcode
    expect(bits(beq, 25, 21)).toBe(8); // rs
    expect(bits(beq, 20, 16)).toBe(9); // rt
    expect(bits(beq, 15, 0)).toBe(1); // imm16
  });
  it('fatia de 32 bits devolve o valor sem sinal', () => {
    expect(bits(-1, 31, 0)).toBe(0xffffffff);
    expect(bits(0xad880000, 31, 0)).toBe(0xad880000);
  });
  it('fatia que inclui o bit 31 não fica negativa', () => {
    expect(bits(0x80000000, 31, 28)).toBe(8);
    expect(bits(0xffffffff, 31, 1)).toBe(0x7fffffff);
  });
  it('PC[6:2] endereça a memória de instruções (dá a volta a cada 128 bytes)', () => {
    expect(bits(0, 6, 2)).toBe(0);
    expect(bits(20, 6, 2)).toBe(5);
    expect(bits(128, 6, 2)).toBe(0);
  });
  it('rejeita fatias inválidas', () => {
    expect(() => bits(0, 32, 0)).toThrow(RangeError);
    expect(() => bits(0, 3, -1)).toThrow(RangeError);
    expect(() => bits(0, 2, 5)).toThrow(RangeError);
    expect(() => bits(0, 2.5, 0)).toThrow(RangeError);
  });
});

describe('bit', () => {
  it('lê um único bit', () => {
    expect(bit(0x80000000, 31)).toBe(1);
    expect(bit(0x80000000, 30)).toBe(0);
    expect(bit(5, 0)).toBe(1);
    expect(bit(5, 1)).toBe(0);
  });
});

describe('hex', () => {
  it('formata 32 bits com 8 dígitos maiúsculos', () => {
    expect(hex(0x11090001)).toBe('0x11090001');
    expect(hex(0xad880000)).toBe('0xAD880000');
    expect(hex(0)).toBe('0x00000000');
    expect(hex(-1)).toBe('0xFFFFFFFF');
  });
  it('aceita número de dígitos e descarta os bits de cima', () => {
    expect(hex(0x2a, 2)).toBe('0x2A');
    expect(hex(0x12345678, 3)).toBe('0x678');
    expect(hex(-1, 4)).toBe('0xFFFF');
  });
  it('rejeita mais de 8 dígitos', () => {
    expect(() => hex(0, 9)).toThrow(RangeError);
  });
});

describe('bin', () => {
  it('formata 32 bits por padrão', () => {
    expect(bin(5)).toBe('00000000000000000000000000000101');
    expect(bin(-1)).toBe('1'.repeat(32));
  });
  it('aceita largura e descarta os bits de cima', () => {
    expect(bin(0b110, 3)).toBe('110');
    expect(bin(2, 2)).toBe('10');
    expect(bin(0xff, 4)).toBe('1111');
    expect(bin(9, 5)).toBe('01001');
  });
});
