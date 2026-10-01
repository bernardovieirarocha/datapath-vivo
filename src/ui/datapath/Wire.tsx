import type { WireKind } from '../../core/netlist';
import { descrever, formatar, type Formato } from '../format';
import type { Pt, WireLayout } from './monoLayout';

export type WireStatus = 'ativo' | 'inativo' | 'futuro';

interface Props {
  id: string;
  layout: WireLayout;
  width: number;
  kind: WireKind;
  value: number | undefined;
  status: WireStatus;
  formato: Formato;
  destaque?: boolean;
}

const d = (pts: readonly Pt[]) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

function strokeWidth(width: number): number {
  if (width === 1) return 1.5;
  if (width <= 6) return 2;
  return 3;
}

/** Fio do datapath: espessura pela largura, cor pela categoria, etiqueta com o valor. */
export function Wire({ id, layout, width, kind, value, status, formato, destaque }: Props) {
  const mostraValor = status === 'ativo' && value !== undefined;
  const titulo = `${id} (${width} ${width === 1 ? 'bit' : 'bits'})${
    mostraValor
      ? `: ${descrever(value, width)}`
      : status === 'futuro'
        ? ': ainda não alcançado nesta etapa'
        : ': não utilizado neste ciclo'
  }`;
  const branches = layout.paths.slice(1);
  const last = layout.paths.map((p) => p[p.length - 1]!);
  return (
    <g
      className={`wire wire-${kind} wire-${status}${destaque ? ' wire-destaque' : ''}`}
      data-wire={id}
      data-status={status}
    >
      <title>{titulo}</title>
      {layout.paths.map((p, i) => (
        <path key={i} d={d(p)} className="wire-hit" />
      ))}
      {destaque &&
        layout.paths.map((p, i) => <path key={`g${i}`} d={d(p)} className="wire-glow" />)}
      {layout.paths.map((p, i) => (
        <path key={i} d={d(p)} className="wire-line" strokeWidth={strokeWidth(width)} />
      ))}
      {branches.map((p, i) => (
        <circle key={i} cx={p[0]![0]} cy={p[0]![1]} r={3} className="wire-dot" />
      ))}
      {last.map(([x, y], i) => (
        <circle key={`e${i}`} cx={x} cy={y} r={1.6} className="wire-end" />
      ))}
      {layout.nome && (
        <text
          x={layout.nome.at[0]}
          y={layout.nome.at[1]}
          textAnchor={layout.nome.anchor ?? 'start'}
          className={kind === 'controle' ? 'wire-name wire-name-ctl' : 'wire-name'}
        >
          {layout.nome.text}
          {kind === 'controle' && mostraValor ? ` = ${formatar(value, width, kind, formato)}` : ''}
        </text>
      )}
      {mostraValor && layout.tag && kind !== 'controle' && (
        <ValueTag at={layout.tag} text={formatar(value, width, kind, formato)} />
      )}
    </g>
  );
}

function ValueTag({ at, text }: { at: Pt; text: string }) {
  const w = Math.max(18, text.length * 7 + 8);
  return (
    <g className="value-tag" transform={`translate(${at[0]} ${at[1]})`}>
      <rect x={-w / 2} y={-9} width={w} height={18} rx={4} />
      <text x={0} y={4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
