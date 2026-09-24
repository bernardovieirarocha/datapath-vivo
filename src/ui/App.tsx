import { useEffect, useState } from 'react';
import { MODULOS } from '../content/modulos';
import { Execucao } from './modes/execucao/Execucao';
import { Codificacao } from './modes/codificacao/Codificacao';
import { Controle } from './modes/controle/Controle';
import { Explorar } from './modes/explorar/Explorar';
import { lerRota, type Rota } from './rota';
import { TemaToggle } from './TemaToggle';

/** Módulos já implementados → rota. */
const ROTAS: Partial<Record<string, string>> = { M1: '#/m1', M3: '#/m3', M4: '#/m4' };

export function App() {
  const [rota, setRota] = useState<Rota>(() => lerRota(location.hash));
  useEffect(() => {
    const onHash = () => setRota(lerRota(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (rota.pagina === 'programa') return <Execucao />;
  if (rota.pagina === 'instrucao') return <Explorar inicial={rota.instrucao} />;
  if (rota.pagina === 'controle') {
    return (
      <Controle
        key={`${rota.secao}${rota.instrucao ?? ''}`}
        secao={rota.secao}
        instrucao={rota.instrucao}
      />
    );
  }
  if (rota.pagina === 'codificacao')
    return <Codificacao key={rota.instrucao} inicial={rota.instrucao} />;

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
