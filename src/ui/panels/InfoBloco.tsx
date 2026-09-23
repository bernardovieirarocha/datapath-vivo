import { MONO_NETLIST, type Snapshot } from '../../core/mono';
import { BLOCOS } from '../../content/blocos';
import { descrever } from '../format';

interface Props {
  id: string;
  snapshot: Snapshot;
  onClose: () => void;
}

const COMP = new Map(MONO_NETLIST.components.map((c) => [c.id, c]));

/** "Nada é mágico": o que o bloco faz, portas com largura e valor atual, e o slide. */
export function InfoBloco({ id, snapshot, onClose }: Props) {
  const c = COMP.get(id);
  const t = BLOCOS[id];
  if (!c || !t) return null;
  const entradas = MONO_NETLIST.wires.filter((w) => w.to.some((p) => p.component === id));
  const saidas = MONO_NETLIST.wires.filter((w) => w.from.component === id);
  const alu = id === 'alu' ? snapshot.internals.alu : undefined;
  return (
    <aside className="info-bloco" aria-labelledby="info-titulo">
      <header>
        <h2 id="info-titulo">{t.titulo}</h2>
        <button
          type="button"
          className="btn btn-icone"
          onClick={onClose}
          aria-label="Fechar explicação"
        >
          ×
        </button>
      </header>
      <p className="muted">
        {t.naFigura && (
          <>
            Na figura: <span className="mono">{t.naFigura}</span> ·{' '}
          </>
        )}
        {t.tipo === 'sequencial'
          ? 'Elemento de estado (sequencial)'
          : t.tipo === 'controle'
            ? 'Controle'
            : 'Combinacional'}
      </p>
      <p>{t.descricao}</p>
      <Portas titulo="Entradas" fios={entradas} snapshot={snapshot} />
      <Portas titulo="Saídas" fios={saidas} snapshot={snapshot} />
      {alu && (
        <details>
          <summary>Detalhes internos da ULA</summary>
          <ul className="portas">
            <li>
              B depois do Bnegate: <span className="mono">{descrever(alu.bMux, 32)}</span>
            </li>
            <li>
              Soma/subtração: <span className="mono">{descrever(alu.somasub, 32)}</span>
            </li>
            <li>
              Overflow: <span className="mono">{alu.overflow}</span> (não é usado pelo datapath; no
              MIPS real o add geraria exceção)
            </li>
          </ul>
        </details>
      )}
      <p className="slide-ref">📖 {t.slide}</p>
    </aside>
  );
}

function Portas({
  titulo,
  fios,
  snapshot,
}: {
  titulo: string;
  fios: typeof MONO_NETLIST.wires;
  snapshot: Snapshot;
}) {
  if (fios.length === 0) return null;
  return (
    <>
      <h3>{titulo}</h3>
      <ul className="portas">
        {fios.map((w) => (
          <li key={w.id}>
            <span className="mono">{w.id}</span>{' '}
            <small>
              ({w.width} {w.width === 1 ? 'bit' : 'bits'})
            </small>
            : <span className="mono">{descrever(snapshot.wires[w.id]!, w.width)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
