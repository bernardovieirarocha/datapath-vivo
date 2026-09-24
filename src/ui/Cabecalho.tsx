import type { ReactNode } from 'react';
import type { Formato } from './format';
import { TemaToggle } from './TemaToggle';

interface Props {
  titulo: string;
  children?: ReactNode;
  formato?: Formato;
  onFormato?: (f: Formato) => void;
}

/** Barra do topo dos módulos: marca, título/abas, hex/dec e tema. */
export function Cabecalho({ titulo, children, formato, onFormato }: Props) {
  return (
    <header className="barra">
      <a href="#/" className="marca">
        Datapath Vivo
      </a>
      <h1>{titulo}</h1>
      {children}
      <div className="opcoes">
        {formato && onFormato && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={formato === 'hex'}
              onChange={(e) => onFormato(e.target.checked ? 'hex' : 'dec')}
            />{' '}
            Hex
          </label>
        )}
        <TemaToggle />
      </div>
    </header>
  );
}

/** Abas por hash (ex.: #/m3, #/m3/tabelas). */
export function AbasHash({
  abas,
  atual,
}: {
  abas: readonly { href: string; nome: string }[];
  atual: string;
}) {
  return (
    <nav className="modo-tabs" aria-label="Seções">
      {abas.map((a) => (
        <a key={a.href} href={a.href} aria-current={a.href === atual ? 'page' : undefined}>
          {a.nome}
        </a>
      ))}
    </nav>
  );
}
