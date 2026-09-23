import type { ComponentLayout, Pt } from './monoLayout';
import { MUX_H, MUX_W } from './monoLayout';

export type BlockStatus = 'ativo' | 'inativo' | 'futuro';

interface Props {
  id: string;
  titulo: string;
  layout: ComponentLayout;
  status: BlockStatus;
  selecionado: boolean;
  controle: boolean;
  /** Para mux: entrada selecionada (0 ou 1). */
  sel?: number;
  onSelect: (id: string) => void;
}

const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

/** Um bloco do datapath (ULA, somador, memória, banco, elipse, mux, AND). Clicável. */
export function Block({ id, titulo, layout, status, selecionado, controle, sel, onSelect }: Props) {
  const cls = [
    'block',
    `block-${layout.shape.kind}`,
    `block-${status}`,
    controle ? 'block-controle' : '',
    selecionado ? 'block-selecionado' : '',
  ].join(' ');
  const activate = () => onSelect(id);
  return (
    <g
      className={cls}
      data-block={id}
      role="button"
      tabIndex={0}
      aria-label={`${titulo} — abrir explicação`}
      aria-pressed={selecionado}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          activate();
        }
      }}
    >
      <title>{titulo}</title>
      <Shape layout={layout} sel={sel} />
      {layout.labels?.map((l, i) => (
        <text
          key={i}
          x={l.at[0]}
          y={l.at[1]}
          textAnchor={l.anchor ?? 'start'}
          fontSize={l.size ?? 11}
          className="block-label"
        >
          {l.text}
        </text>
      ))}
    </g>
  );
}

function Shape({ layout, sel }: { layout: ComponentLayout; sel?: number }) {
  const s = layout.shape;
  switch (s.kind) {
    case 'rect':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={3} className="block-body" />;
    case 'ellipse':
      return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className="block-body" />;
    case 'alu':
      return <polygon points={pts(s.points)} className="block-body" />;
    case 'and':
      return <path d={`M${s.x} ${s.y} h20 a20 20 0 0 1 0 40 h-20 z`} className="block-body" />;
    case 'bus':
      return <rect x={s.x - 7} y={s.y1} width={14} height={s.y2 - s.y1} className="block-hit" />;
    case 'text':
      return <rect x={s.x - 10} y={s.y - 14} width={20} height={20} className="block-hit" />;
    case 'mux': {
      const { x, y, top } = s;
      const cx = x + MUX_W / 2;
      const inTop = y + 20;
      const inBottom = y + 60;
      const outY = y + MUX_H / 2;
      // entrada selecionada: in(sel) fica em cima se top === sel
      const selY = sel === undefined ? undefined : sel === top ? inTop : inBottom;
      return (
        <>
          <rect x={x} y={y} width={MUX_W} height={MUX_H} rx={MUX_W / 2} className="block-body" />
          <text x={cx} y={inTop - 5} fontSize={9} textAnchor="middle" className="block-label">
            {top}
          </text>
          <text x={cx} y={inBottom + 12} fontSize={9} textAnchor="middle" className="block-label">
            {1 - top}
          </text>
          {selY !== undefined && (
            <path d={`M${x} ${selY} L${x + MUX_W} ${outY}`} className="mux-switch" />
          )}
        </>
      );
    }
  }
}
