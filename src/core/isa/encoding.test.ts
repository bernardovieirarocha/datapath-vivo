import { describe, expect, it } from 'vitest';
import golden from '../../../reference/golden_trace_pratica10.json';
import { decode, encode, fields } from './encoding';
import { INSTRUCTIONS, type Instruction, type Mnemonic } from './instructions';

/** Uma instrução de exemplo por mnemônico, variando os campos. */
function samples(m: Mnemonic): Instruction[] {
  const regs = [0, 1, 8, 16, 31];
  const imms = [0, 1, -1, 2, 32767, -32768, 0x1234];
  const out: Instruction[] = [];
  const spec = INSTRUCTIONS.find((s) => s.mnemonic === m)!;
  for (const a of regs) {
    for (const b of regs) {
      switch (spec.syntax) {
        case 'rd,rs,rt':
          out.push({ mnemonic: m as 'add', rd: a, rs: b, rt: (a + b) % 32 });
          break;
        case 'rs':
          out.push({ mnemonic: 'jr', rs: a });
          break;
        case 'target':
          out.push({ mnemonic: m as 'j', target: (a << 21) | (b << 3) | 5 });
          break;
        default:
          for (const imm of imms) out.push({ mnemonic: m as 'addi', rs: a, rt: b, imm });
      }
    }
  }
  out.push(...(spec.syntax === 'target' ? [{ mnemonic: m as 'j', target: 0x3ffffff }] : []));
  return out;
}

describe('encode/decode: ida e volta', () => {
  for (const spec of INSTRUCTIONS) {
    it(`${spec.mnemonic}: decode(encode(x)) == x`, () => {
      for (const instr of samples(spec.mnemonic)) {
        const d = decode(encode(instr));
        expect(d.ok).toBe(true);
        if (d.ok) {
          expect(d.instr).toEqual(instr);
          expect(d.spec.mnemonic).toBe(spec.mnemonic);
          expect(d.ignored).toEqual([]);
        }
      }
    });
  }

  it('encode(decode(w)) == w para palavras aleatórias canônicas', () => {
    let seed = 12345;
    const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0);
    let checked = 0;
    for (let n = 0; n < 20000; n++) {
      const w = rand();
      const d = decode(w);
      if (d.ok && d.ignored.length === 0) {
        expect(encode(d.instr)).toBe(w);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('programa de exemplo (o do golden trace)', () => {
  const expected: [Instruction, number][] = [
    [{ mnemonic: 'beq', rs: 8, rt: 9, imm: 1 }, 0x11090001],
    [{ mnemonic: 'addi', rt: 8, rs: 8, imm: 2 }, 0x21080002],
    [{ mnemonic: 'sw', rt: 8, rs: 12, imm: 0 }, 0xad880000],
    [{ mnemonic: 'lw', rt: 16, rs: 12, imm: 0 }, 0x8d900000],
    [{ mnemonic: 'sub', rd: 8, rs: 16, rt: 10 }, 0x020a4022],
    [{ mnemonic: 'j', target: 0 }, 0x08000000],
  ];
  it.each(expected)('%o → %i', (instr, word) => {
    expect(encode(instr)).toBe(word);
    const d = decode(word);
    expect(d.ok && d.instr).toEqual(instr);
  });
  it('bate com o hex do golden trace', () => {
    expect(expected.map(([, w]) => w)).toEqual(golden.program.map((p) => Number(p.hex)));
  });
});

describe('decode', () => {
  it('fatia os campos dos formatos R, I e J', () => {
    expect(fields(0x020a4022)).toEqual({
      opcode: 0,
      rs: 16,
      rt: 10,
      rd: 8,
      shamt: 0,
      funct: 0b100010,
      imm16: 0x4022,
      target: 0x020a4022,
    });
  });
  it('opcode desconhecido', () => {
    const d = decode(0xfc000000);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('opcode desconhecido: 111111');
  });
  it('funct desconhecido (ex.: 0x00000000 = sll, fora do subconjunto da aula)', () => {
    const d = decode(0);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toBe('funct desconhecido: 000000');
  });
  it('marca as instruções de extensão como base: false', () => {
    const d = decode(encode({ mnemonic: 'bne', rs: 1, rt: 2, imm: -3 }));
    expect(d.ok && d.spec.base).toBe(false);
  });
  it('avisa campos que o datapath ignora', () => {
    const add = decode(0x020a4022 | (3 << 6));
    expect(add.ok && add.ignored).toEqual(['shamt']);
    const jr = decode(encode({ mnemonic: 'jr', rs: 31 }) | (1 << 16) | (2 << 11) | (3 << 6));
    expect(jr.ok && jr.ignored).toEqual(['rt', 'rd', 'shamt']);
  });
  it('imediato negativo sai com sinal', () => {
    const d = decode(0x1109ffff);
    expect(d.ok && d.instr).toEqual({ mnemonic: 'beq', rs: 8, rt: 9, imm: -1 });
  });
});

describe('encode: campos fora da faixa', () => {
  it.each<[Instruction, RegExp]>([
    [{ mnemonic: 'add', rd: 32, rs: 0, rt: 0 }, /rd/],
    [{ mnemonic: 'add', rd: 1, rs: -1, rt: 0 }, /rs/],
    [{ mnemonic: 'add', rd: 1, rs: 0, rt: 1.5 }, /rt/],
    [{ mnemonic: 'jr', rs: 40 }, /rs/],
    [{ mnemonic: 'addi', rt: 1, rs: 1, imm: 32768 }, /imediato/],
    [{ mnemonic: 'sw', rt: 1, rs: 1, imm: -32769 }, /imediato/],
    [{ mnemonic: 'j', target: 0x4000000 }, /endereço/],
  ])('%o', (instr, msg) => {
    expect(() => encode(instr)).toThrow(msg);
  });
});
