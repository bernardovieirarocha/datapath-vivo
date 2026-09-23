import { describe, expect, it } from 'vitest';
import { MONO_NETLIST } from '../../core/mono';
import { BLOCOS } from '../../content/blocos';
import { COMPONENTS, VIEWBOX, WIRES } from './monoLayout';

describe('layout do datapath usa os mesmos ids da netlist', () => {
  it('todo fio da netlist tem desenho, e nada sobra', () => {
    expect(Object.keys(WIRES).sort()).toEqual(MONO_NETLIST.wires.map((w) => w.id).sort());
  });
  it('todo componente tem desenho e texto explicativo', () => {
    const ids = MONO_NETLIST.components.map((c) => c.id).sort();
    expect(Object.keys(COMPONENTS).sort()).toEqual(ids);
    expect(Object.keys(BLOCOS).sort()).toEqual(ids);
  });
  it('coordenadas dentro do viewBox', () => {
    for (const [id, w] of Object.entries(WIRES)) {
      for (const p of w.paths.flat()) {
        expect(p[0] >= 0 && p[0] <= VIEWBOX.w && p[1] >= 0 && p[1] <= VIEWBOX.h, id).toBe(true);
      }
      // polilinhas ortogonais (como na figura do slide)
      for (const path of w.paths) {
        for (let i = 1; i < path.length; i++) {
          const [a, b] = [path[i - 1]!, path[i]!];
          expect(a[0] === b[0] || a[1] === b[1], `${id}: segmento diagonal`).toBe(true);
        }
      }
    }
  });
});
