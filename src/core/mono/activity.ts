import { MONO_NETLIST } from './datapath';
import type { Snapshot } from './step';

export interface Activity {
  /** Fios que influenciam algo que é escrito neste ciclo. */
  wires: ReadonlySet<string>;
  /** Componentes nesse caminho (inclusive os elementos de estado escritos). */
  components: ReadonlySet<string>;
}

const COMPONENTS = new Map(MONO_NETLIST.components.map((c) => [c.id, c]));
const WIRES = new Map(MONO_NETLIST.wires.map((w) => [w.id, w]));
const INPUT_WIRE = new Map<string, string>();
for (const w of MONO_NETLIST.wires) {
  for (const t of w.to) INPUT_WIRE.set(`${t.component}.${t.port}`, w.id);
}
const CONTROL_OUTPUTS = new Set(
  MONO_NETLIST.wires.filter((w) => w.from.component === 'control').map((w) => w.id),
);

/**
 * Quais fios e blocos estão "ativos" no ciclo (docs/PLANO.md, Seção 6, decisão 4).
 *
 * Parte dos elementos de estado efetivamente escritos (PC sempre; banco se
 * RegWrite habilitado; memória de dados se MemWrite habilitado) e anda para trás
 * no grafo. Num mux, segue só a entrada selecionada (e o seletor). A leitura da
 * memória de dados só conta se MemRead = 1. Sinais de controle ativos: os que
 * valem 1 ou que selecionam um mux num caminho ativo.
 */
export function computeActivity(snapshot: Pick<Snapshot, 'wires'>): Activity {
  const v = (id: string) => snapshot.wires[id] ?? 0;
  const wires = new Set<string>();
  const components = new Set<string>();

  const visitInput = (component: string, port: string) => {
    const id = INPUT_WIRE.get(`${component}.${port}`);
    if (id !== undefined) visitWire(id);
  };

  const visitWire = (id: string) => {
    if (wires.has(id)) return;
    wires.add(id);
    const w = WIRES.get(id)!;
    const c = COMPONENTS.get(w.from.component)!;
    components.add(c.id);
    const output = c.outputs.find((o) => o.name === w.from.port)!;

    if (c.kind === 'mux') {
      visitInput(c.id, 'sel');
      visitInput(c.id, v(INPUT_WIRE.get(`${c.id}.sel`)!) === 1 ? 'in1' : 'in0');
      return;
    }
    if (c.kind === 'dmem' && v('MemRead') !== 1) return;
    for (const dep of output.deps) visitInput(c.id, dep);
  };

  const writeTarget = (component: string, ports: readonly string[]) => {
    components.add(component);
    for (const p of ports) visitInput(component, p);
  };

  writeTarget('pc', v('reset') === 1 ? ['reset'] : ['in']);
  if (v('reg_write_enable') === 1) writeTarget('regfile', ['writeReg', 'writeData', 'regWrite']);
  if (v('mem_write_enable') === 1) writeTarget('dmem', ['address', 'writeData', 'memWrite']);

  for (const id of CONTROL_OUTPUTS) {
    if (v(id) !== 0) visitWire(id);
  }

  return { wires, components };
}
