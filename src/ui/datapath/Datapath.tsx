import { memo } from 'react';
import type { Activity } from '../../core/mono';
import { MONO_NETLIST } from '../../core/mono';
import { BLOCOS } from '../../content/blocos';
import type { Formato } from '../format';
import { Block, type BlockStatus } from './Block';
import { COMPONENTS, VIEWBOX, WIRES } from './monoLayout';
import { Wire, type WireStatus } from './Wire';

interface Props {
  wires: Readonly<Record<string, number>>;
  activity: Activity;
  /** Fase visual atual (1..5); 5 mostra o ciclo inteiro. */
  fase: number;
  formato: Formato;
  selecionado: string | null;
  onSelect: (id: string) => void;
}

/** Fio que chega na porta `sel` de cada mux. */
const SEL_WIRE = new Map<string, string>();
for (const w of MONO_NETLIST.wires) {
  for (const t of w.to) if (t.port === 'sel') SEL_WIRE.set(t.component, w.id);
}

/** Ordem de desenho: controle por baixo, dados por cima, depois os blocos. */
const WIRE_ORDER = [...MONO_NETLIST.wires].sort(
  (a, b) => Number(b.kind === 'controle') - Number(a.kind === 'controle'),
);

function DatapathImpl({ wires, activity, fase, formato, selecionado, onSelect }: Props) {
  const wireStatus = (id: string): WireStatus => {
    if (WIRES[id]!.fase > fase) return 'futuro';
    return activity.wires.has(id) ? 'ativo' : 'inativo';
  };
  const blockStatus = (id: string): BlockStatus => {
    if (COMPONENTS[id]!.fase > fase) return 'futuro';
    if (id === 'fields') return activity.wires.has('instr') ? 'ativo' : 'inativo';
    return activity.components.has(id) ? 'ativo' : 'inativo';
  };

  return (
    <svg
      className="datapath"
      viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
      role="group"
      aria-label="Caminho de dados monociclo"
    >
      {WIRE_ORDER.map((w) => (
        <Wire
          key={w.id}
          id={w.id}
          layout={WIRES[w.id]!}
          width={w.width}
          kind={w.kind}
          value={wires[w.id]}
          status={wireStatus(w.id)}
          formato={formato}
        />
      ))}
      {MONO_NETLIST.components.map((c) => {
        const selWire = SEL_WIRE.get(c.id);
        const st = blockStatus(c.id);
        return (
          <Block
            key={c.id}
            id={c.id}
            titulo={BLOCOS[c.id]?.titulo ?? c.label}
            layout={COMPONENTS[c.id]!}
            status={st}
            controle={c.kind === 'control' || c.kind === 'aluControl'}
            selecionado={selecionado === c.id}
            sel={selWire !== undefined && st !== 'futuro' ? wires[selWire] : undefined}
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

export const Datapath = memo(DatapathImpl);
