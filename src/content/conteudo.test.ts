import { describe, expect, it } from 'vitest';
import { runFaultCases } from '../core/faults';
import { passosDecodificacao } from './codificacao';
import { descreverDiferencas } from './efeitos';

describe('descreverDiferencas', () => {
  it('registrador errado, valor errado, sem escrita, escrita indevida, memória e PC', () => {
    expect(
      descreverDiferencas([
        { kind: 'reg', expected: { index: 8, value: 42 }, actual: { index: 18, value: 42 } },
        { kind: 'reg', expected: { index: 8, value: 42 }, actual: { index: 8, value: 0 } },
        { kind: 'reg', expected: { index: 8, value: 42 } },
        { kind: 'reg', actual: { index: 18, value: 0xffffffff } },
        { kind: 'mem', expected: { address: 72, value: 99 }, actual: { address: 0, value: 99 } },
        { kind: 'mem', expected: { address: 72, value: 99 }, actual: { address: 72, value: 1 } },
        { kind: 'mem', expected: { address: 72, value: 99 } },
        { kind: 'mem', actual: { address: 40, value: 5 } },
        { kind: 'pc', expected: 24, actual: 12 },
      ]),
    ).toEqual([
      'escreveria em $18 em vez de $8 (valor 42).',
      '$8 receberia 0 em vez de 42.',
      'não escreveria no banco: $8 deveria receber 42 e ficaria com o valor antigo.',
      'escreveria $18 ← -1, mas esta instrução não deveria escrever no banco.',
      'gravaria em M[0] em vez de M[72].',
      'M[72] receberia 1 em vez de 99.',
      'não gravaria na memória: M[72] deveria receber 99.',
      'gravaria M[40] ← 5, mas esta instrução não deveria mexer na memória.',
      'o próximo PC seria 12 (0x0000000C) em vez de 24.',
    ]);
  });
  it('funciona com o resultado real das falhas', () => {
    const r = runFaultCases([{ wire: 'RegDst', mode: 'stuck', value: 0 }])[0]!;
    expect(descreverDiferencas(r.comparison.differences)).toEqual([
      'escreveria em $18 em vez de $8 (valor 42).',
    ]);
  });
});

describe('passosDecodificacao (método da lista)', () => {
  const textos = (w: number) => passosDecodificacao(w).map((p) => p.texto);
  it('tipo R: opcode 0, o funct decide', () => {
    const t = textos(0x02324020); // add $8, $17, $18
    expect(t[1]).toMatch(/formato R.*funct.*100000 = 32, que corresponde à instrução add/);
    expect(t.at(-1)).toBe('Instrução decodificada: add $8, $17, $18');
    expect(t.join(' ')).toContain(
      'rd (15–11) = 01000 = 8 ($8, também denominado $t0): registrador de destino',
    );
  });
  it('tipo I com imediato negativo, tipo J, extensão, desconhecida', () => {
    expect(textos(0x1109ffff).join(' ')).toContain('= -1 (bit 15 = 1: valor negativo');
    expect(textos(0x08000060).join(' ')).toContain('Endereço (25–0) = 96');
    expect(textos(0x14220000)[1]).toContain('não faz parte do datapath da aula');
    expect(textos(0xfc000000)).toHaveLength(2);
    expect(textos(0x0000003f)[1]).toContain('não consta na tabela');
    expect(textos(0x02324060).join(' ')).toContain('ignorado');
  });
});
