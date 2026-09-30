import { AJUDA } from '../content/ajuda';

/** Três passos para quem abre a página pela primeira vez. Reabre pelo botão "?". */
export function Ajuda({ onFechar }: { onFechar: () => void }) {
  return (
    <section className="ajuda" aria-label="Como usar">
      <ol>
        {AJUDA.map((a, i) => (
          <li key={a.titulo}>
            <strong>
              {i + 1}. {a.titulo}
            </strong>
            <span>{a.texto}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={onFechar}>
        Entendi
      </button>
    </section>
  );
}
