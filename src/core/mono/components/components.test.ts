import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toSigned, u32 } from '../../bits';
import { add32, jumpConcat, mux2, shiftLeft2 } from './basic';
import { alu, ALU_OP } from './alu';
import { aluControl } from './aluControl';
import { control, CONTROL_SIGNAL_NAMES, KNOWN_OPCODES, type ControlSignals } from './control';
import { dmemRead, dmemWord, dmemWrite, imemRead } from './memories';

const INT_MIN = 0x80000000;
const INT_MAX = 0x7fffffff;

describe('ULA (ula.v)', () => {
  it('add, sub, and, or, slt', () => {
    expect(alu(5, 3, ALU_OP.add).result).toBe(8);
    expect(toSigned(alu(4, 5, ALU_OP.sub).result)).toBe(-1);
    expect(alu(0b1100, 0b1010, ALU_OP.and).result).toBe(0b1000);
    expect(alu(0b1100, 0b1010, ALU_OP.or).result).toBe(0b1110);
    expect(alu(u32(-3), 2, ALU_OP.slt).result).toBe(1);
    expect(alu(2, u32(-3), ALU_OP.slt).result).toBe(0);
    expect(alu(7, 7, ALU_OP.slt).result).toBe(0);
  });

  it('zero = NOR do resultado', () => {
    expect(alu(5, 5, ALU_OP.sub).zero).toBe(1);
    expect(alu(5, 4, ALU_OP.sub).zero).toBe(0);
    expect(alu(0xf0, 0x0f, ALU_OP.and).zero).toBe(1);
  });

  it('overflow só em add/sub', () => {
    expect(alu(INT_MAX, 1, ALU_OP.add).overflow).toBe(1);
    expect(alu(INT_MIN, 1, ALU_OP.sub).overflow).toBe(1);
    expect(alu(INT_MIN, u32(-1), ALU_OP.add).overflow).toBe(1);
    expect(alu(5, 3, ALU_OP.add).overflow).toBe(0);
    expect(alu(u32(-5), 3, ALU_OP.sub).overflow).toBe(0);
    // slt com overflow na subtração: o flag de saída fica 0, mas ovAddSub entra no SLT
    const r = alu(INT_MIN, 1, ALU_OP.slt);
    expect(r.overflow).toBe(0);
    expect(r.internals.ovAddSub).toBe(1);
  });

  it('slt com sinais opostos usa sinal XOR overflow (−2³¹ < 1)', () => {
    // −2³¹ − 1 dá overflow e o bit de sinal vira 0: a versão ingênua diria "não é menor".
    const r = alu(INT_MIN, 1, ALU_OP.slt);
    expect(r.internals.somasub >>> 31).toBe(0);
    expect(r.result).toBe(1);
    expect(alu(1, INT_MIN, ALU_OP.slt).result).toBe(0);
    expect(alu(INT_MAX, u32(-1), ALU_OP.slt).result).toBe(0);
    expect(alu(u32(-1), INT_MAX, ALU_OP.slt).result).toBe(1);
  });

  it('sinais internos: muxB (Bnegate) e carry', () => {
    const r = alu(5, 3, ALU_OP.sub);
    expect(r.internals.bMux).toBe(u32(~3));
    expect(r.internals.carryOut).toBe(1);
    expect(r.internals.resAnd).toBe(1);
    expect(r.internals.resOr).toBe(7);
    expect(alu(5, 3, ALU_OP.add).internals.bMux).toBe(3);
  });

  it('códigos fora da tabela (011, 100, 101) dão 0, como o resMux.v', () => {
    for (const op of [0b011, 0b100, 0b101]) {
      const r = alu(123, 456, op);
      expect(r.result).toBe(0);
      expect(r.zero).toBe(1);
      expect(r.overflow).toBe(0);
    }
  });

  const u32arb = fc.integer({ min: 0, max: 0xffffffff });
  it('propriedade: add/sub/and/or batem com a aritmética de referência', () => {
    fc.assert(
      fc.property(u32arb, u32arb, (a, b) => {
        expect(alu(a, b, ALU_OP.add).result).toBe(Number((BigInt(a) + BigInt(b)) % 2n ** 32n));
        expect(alu(a, b, ALU_OP.sub).result).toBe(
          Number((BigInt(a) - BigInt(b) + 2n ** 32n) % 2n ** 32n),
        );
        expect(alu(a, b, ALU_OP.and).result).toBe(u32(a & b));
        expect(alu(a, b, ALU_OP.or).result).toBe(u32(a | b));
      }),
      { numRuns: 2000 },
    );
  });

  it('propriedade: slt = (a < b) com sinal, overflow = resultado fora de 32 bits', () => {
    fc.assert(
      fc.property(u32arb, u32arb, (a, b) => {
        const sa = toSigned(a);
        const sb = toSigned(b);
        expect(alu(a, b, ALU_OP.slt).result).toBe(sa < sb ? 1 : 0);
        const sum = sa + sb;
        const diff = sa - sb;
        const out = (x: number) => (x > INT_MAX || x < -INT_MIN ? 1 : 0);
        expect(alu(a, b, ALU_OP.add).overflow).toBe(out(sum));
        expect(alu(a, b, ALU_OP.sub).overflow).toBe(out(diff));
        expect(alu(a, b, ALU_OP.sub).zero).toBe(a === b ? 1 : 0);
      }),
      { numRuns: 2000 },
    );
  });
});

describe('Controle da ULA (aluControl.v) — tabela 2.4', () => {
  it.each([
    [0b00, 0b000000, 0b010],
    [0b00, 0b100010, 0b010], // funct ignorado
    [0b01, 0b000000, 0b110],
    [0b01, 0b100101, 0b110],
    [0b10, 0b100000, 0b010],
    [0b10, 0b100010, 0b110],
    [0b10, 0b100100, 0b000],
    [0b10, 0b100101, 0b001],
    [0b10, 0b101010, 0b111],
  ])('ALUOp %i, funct %i → %i', (aluOp, funct, expected) => {
    expect(aluControl(aluOp, funct)).toBe(expected);
  });

  it('funct desconhecido com ALUOp = 10 → 000 (AND)', () => {
    expect(aluControl(0b10, 0b000000)).toBe(0b000);
    expect(aluControl(0b10, 0b001000)).toBe(0b000); // jr
  });

  it('ALUOp = 11 (não usado pelo controle) → 000', () => {
    expect(aluControl(0b11, 0b100000)).toBe(0b000);
  });

  it('ponte com o livro: os 3 bits do lab = 3 bits de baixo do código de 4 bits do P&H', () => {
    const PH: Record<string, number> = {
      and: 0b0000,
      or: 0b0001,
      add: 0b0010,
      sub: 0b0110,
      slt: 0b0111,
    };
    for (const [name, code] of Object.entries(ALU_OP)) expect(code).toBe(PH[name]! & 0b111);
  });
});

describe('Controle principal (controle_principal.v) — tabela 2.3', () => {
  const row = (s: string): ControlSignals => {
    const [RegDst, ALUSrc, MemtoReg, RegWrite, MemRead, MemWrite, Branch, Jump, ALUOp] =
      s.split(' ');
    const b = (x: string | undefined) => Number(x) as 0 | 1;
    return {
      RegDst: b(RegDst),
      ALUSrc: b(ALUSrc),
      MemtoReg: b(MemtoReg),
      RegWrite: b(RegWrite),
      MemRead: b(MemRead),
      MemWrite: b(MemWrite),
      Branch: b(Branch),
      Jump: b(Jump),
      ALUOp: parseInt(ALUOp!, 2),
    };
  };
  // RegDst ALUSrc MemtoReg RegWrite MemRead MemWrite Branch Jump ALUOp
  it.each([
    ['tipo R', 0b000000, '1 0 0 1 0 0 0 0 10'],
    ['addi', 0b001000, '0 1 0 1 0 0 0 0 00'],
    ['lw', 0b100011, '0 1 1 1 1 0 0 0 00'],
    ['sw', 0b101011, '0 1 0 0 0 1 0 0 00'],
    ['beq', 0b000100, '0 0 0 0 0 0 1 0 01'],
    ['j', 0b000010, '0 0 0 0 0 0 0 1 00'],
  ])('%s', (_name, opcode, expected) => {
    expect(control(opcode)).toEqual(row(expected));
  });

  it('todo opcode desconhecido zera o controle', () => {
    for (let op = 0; op < 64; op++) {
      if (KNOWN_OPCODES.has(op)) continue;
      expect(Object.values(control(op)).every((v) => v === 0)).toBe(true);
    }
    expect(KNOWN_OPCODES.size).toBe(6);
  });

  it('lista os 9 sinais com o vocabulário da aula', () => {
    expect([...CONTROL_SIGNAL_NAMES].sort()).toEqual(Object.keys(control(0)).sort());
  });
});

describe('blocos simples', () => {
  it('mux2to1', () => {
    expect(mux2(0, 10, 20)).toBe(10);
    expect(mux2(1, 10, 20)).toBe(20);
  });
  it('somador ripple-carry com carry out', () => {
    expect(add32(0xffffffff, 1)).toEqual({ sum: 0, cout: 1 });
    expect(add32(4, 8)).toEqual({ sum: 12, cout: 0 });
    expect(add32(1, 1, 1)).toEqual({ sum: 3, cout: 0 });
  });
  it('shift left 2', () => {
    expect(shiftLeft2(1)).toBe(4);
    expect(shiftLeft2(0xffffffff)).toBe(0xfffffffc);
    expect(shiftLeft2(0x3ffffff, 28)).toBe(0xffffffc);
  });
  it('concatenação do jump (exemplo do slide: PC+4 = 0x00400010, addr = 1 → 0x4)', () => {
    expect(jumpConcat(0x00400010, shiftLeft2(1, 28))).toBe(0x00000004);
    expect(jumpConcat(0xa0000000, 0xffffffc)).toBe(0xaffffffc);
  });
});

describe('memórias', () => {
  it('memória de instruções usa PC[6:2] (dá a volta a cada 128 bytes)', () => {
    const imem = Array.from({ length: 32 }, (_, i) => i + 100);
    expect(imemRead(imem, 0)).toBe(100);
    expect(imemRead(imem, 20)).toBe(105);
    expect(imemRead(imem, 124)).toBe(131);
    expect(imemRead(imem, 128)).toBe(100);
    expect(imemRead(imem, 0x400004)).toBe(101);
  });

  it('memória de dados little-endian (byte 0 = LSB)', () => {
    const bytes = dmemWrite(new Array(64).fill(0), 8, 0x11223344);
    expect(bytes.slice(8, 12)).toEqual([0x44, 0x33, 0x22, 0x11]);
    expect(dmemWord(bytes, 8)).toBe(0x11223344);
  });

  it('leitura com MemRead = 0 dá 0', () => {
    const bytes = dmemWrite(new Array(64).fill(0), 0, 0xdeadbeef);
    expect(dmemRead(bytes, 0, 0)).toBe(0);
    expect(dmemRead(bytes, 0, 1)).toBe(0xdeadbeef);
  });

  it('só address[7:2] conta: 2 bits de baixo ignorados, endereço 256 volta ao 0', () => {
    const bytes = dmemWrite(new Array(64).fill(0), 0, 42);
    expect(dmemRead(bytes, 3, 1)).toBe(42);
    expect(dmemRead(bytes, 256, 1)).toBe(42);
  });

  it('fora dos 64 bytes: leitura 0 e escrita descartada', () => {
    const bytes = new Array(64).fill(7);
    expect(dmemRead(bytes, 64, 1)).toBe(0);
    expect(dmemWrite(bytes, 64, 0xffffffff)).toEqual(bytes);
  });
});
