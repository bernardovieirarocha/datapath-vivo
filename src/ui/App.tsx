import { MODULOS } from '../content/modulos';

export function App() {
  return (
    <main className="home">
      <header>
        <h1>Datapath Vivo</h1>
        <p className="subtitulo">Caminho de dados MIPS da Prática 10 — AOC1 / LAOC1, CEFET-MG</p>
      </header>
      <nav aria-label="Módulos">
        <ul className="modulos">
          {MODULOS.map((m) => (
            <li key={m.id}>
              <button type="button" className="modulo" disabled aria-describedby={`${m.id}-status`}>
                <span className="modulo-id">{m.id}</span>
                <span className="modulo-titulo">{m.titulo}</span>
                <span className="modulo-resumo">{m.resumo}</span>
                <span className="modulo-status" id={`${m.id}-status`}>
                  Em construção (fase {m.fase})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
