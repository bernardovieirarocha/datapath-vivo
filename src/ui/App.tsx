import { useEffect, useState } from 'react';
import { MODULOS } from '../content/modulos';
import { Execucao } from './modes/execucao/Execucao';
import { lerRota, type Pagina } from './rota';
import { TemaToggle } from './TemaToggle';

/** Módulos já implementados → rota. */
const ROTAS: Partial<Record<string, string>> = { M1: '#/m1' };

export function App() {
  const [pagina, setPagina] = useState<Pagina>(() => lerRota(location.hash));
  useEffect(() => {
    const onHash = () => setPagina(lerRota(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (pagina === 'm1') return <Execucao />;

  return (
    <main className="home">
      <header className="home-topo">
        <div>
          <h1>Datapath Vivo</h1>
          <p className="subtitulo">Caminho de dados MIPS, como nas aulas de AOC1 — CEFET-MG</p>
        </div>
        <TemaToggle />
      </header>
      <nav aria-label="Módulos">
        <ul className="modulos">
          {MODULOS.map((m) => {
            const href = ROTAS[m.id];
            const conteudo = (
              <>
                <span className="modulo-id">{m.id}</span>
                <span className="modulo-titulo">{m.titulo}</span>
                <span className="modulo-resumo">{m.resumo}</span>
                <span className="modulo-status" id={`${m.id}-status`}>
                  {href ? 'Abrir' : `Em construção (fase ${m.fase})`}
                </span>
              </>
            );
            return (
              <li key={m.id}>
                {href ? (
                  <a className="modulo modulo-pronto" href={href}>
                    {conteudo}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="modulo"
                    disabled
                    aria-describedby={`${m.id}-status`}
                  >
                    {conteudo}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
