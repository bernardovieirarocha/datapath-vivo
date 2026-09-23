import { useEffect, useState } from 'react';
import { aplicarTema, lerTema, type Tema } from './tema';

const PROXIMO: Record<Tema, Tema> = { sistema: 'claro', claro: 'escuro', escuro: 'sistema' };
const NOME: Record<Tema, string> = {
  sistema: 'Tema: sistema',
  claro: 'Tema: claro',
  escuro: 'Tema: escuro',
};

export function TemaToggle() {
  const [tema, setTema] = useState<Tema>(lerTema);
  useEffect(() => aplicarTema(tema), [tema]);
  return (
    <button
      type="button"
      className="btn"
      onClick={() => setTema(PROXIMO[tema])}
      aria-label={`${NOME[tema]} (clique para trocar)`}
    >
      {tema === 'escuro' ? '☾' : tema === 'claro' ? '☀' : '◐'} {NOME[tema].replace('Tema: ', '')}
    </button>
  );
}
