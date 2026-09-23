import { describe, expect, it } from 'vitest';
import { evaluationOrder, validateNetlist, type Netlist } from './netlist';

const ok: Netlist = {
  components: [
    { id: 'src', kind: 'x', label: 'S', inputs: [], outputs: [{ name: 'o', deps: [] }] },
    {
      id: 'reg',
      kind: 'x',
      label: 'R',
      inputs: ['d', 'q'],
      edgeInputs: ['d'],
      outputs: [{ name: 'o', deps: ['q'] }],
    },
    { id: 'inv', kind: 'x', label: 'I', inputs: ['a'], outputs: [{ name: 'o', deps: ['a'] }] },
  ],
  wires: [
    {
      id: 'w1',
      width: 1,
      kind: 'dados',
      from: { component: 'src', port: 'o' },
      to: [{ component: 'reg', port: 'q' }],
    },
    {
      id: 'w2',
      width: 1,
      kind: 'dados',
      from: { component: 'reg', port: 'o' },
      to: [{ component: 'inv', port: 'a' }],
    },
    // realimentação pela entrada de borda: não é laço combinacional
    {
      id: 'w3',
      width: 1,
      kind: 'dados',
      from: { component: 'inv', port: 'o' },
      to: [{ component: 'reg', port: 'd' }],
    },
  ],
};

describe('validateNetlist', () => {
  it('aceita netlist correta com realimentação por elemento sequencial', () => {
    expect(validateNetlist(ok)).toEqual([]);
    expect(evaluationOrder(ok)).toEqual(['src', 'reg', 'inv']);
  });

  it('aponta cada tipo de problema', () => {
    const bad: Netlist = {
      components: [
        ...ok.components,
        { id: 'inv', kind: 'x', label: 'dup', inputs: [], outputs: [] },
        {
          id: 'z',
          kind: 'x',
          label: 'Z',
          inputs: ['a'],
          edgeInputs: ['nope', 'a'],
          outputs: [{ name: 'o', deps: ['ghost', 'a'] }],
        },
      ],
      wires: [
        ...ok.wires,
        {
          id: 'w1',
          width: 0,
          kind: 'dados',
          from: { component: 'nada', port: 'o' },
          to: [
            { component: 'reg', port: 'q' },
            { component: 'inv', port: 'zz' },
          ],
        },
      ],
    };
    const p = validateNetlist(bad);
    expect(p).toEqual(
      expect.arrayContaining([
        'componente duplicado: inv',
        'z: entrada de borda nope não declarada',
        'z.o: depende de ghost, que não existe',
        'z.o: depende da entrada de borda a',
        'fio duplicado: w1',
        'w1: largura inválida 0',
        'w1: origem nada.o não existe',
        'w1: destino inv.zz não existe',
        'reg.q: ligada a w1 e w1',
        'z.a: entrada sem fio',
      ]),
    );
  });

  it('detecta laço combinacional', () => {
    const loop: Netlist = {
      components: [
        { id: 'a', kind: 'x', label: 'A', inputs: ['i'], outputs: [{ name: 'o', deps: ['i'] }] },
        { id: 'b', kind: 'x', label: 'B', inputs: ['i'], outputs: [{ name: 'o', deps: ['i'] }] },
      ],
      wires: [
        {
          id: 'x',
          width: 1,
          kind: 'dados',
          from: { component: 'a', port: 'o' },
          to: [{ component: 'b', port: 'i' }],
        },
        {
          id: 'y',
          width: 1,
          kind: 'dados',
          from: { component: 'b', port: 'o' },
          to: [{ component: 'a', port: 'i' }],
        },
      ],
    };
    expect(validateNetlist(loop)).toEqual(['laço combinacional: a → b → a']);
  });
});
