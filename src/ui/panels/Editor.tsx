import { useState } from 'react';
import { formatAsmError } from '../../core/isa';
import { EXEMPLOS } from '../../content/exemplos';
import { useExecucao } from '../modes/execucao/store';

interface Props {
  onCopiarLink: () => Promise<boolean>;
}

/** Editor de programa (Assembly) e de estado inicial, com exemplos prontos. */
export function Editor({ onCopiarLink }: Props) {
  const store = useExecucao();
  const [programa, setPrograma] = useState(store.programa);
  const [estado, setEstado] = useState(store.estado);
  const [copiado, setCopiado] = useState<'ok' | 'erro' | null>(null);
  const alterado = programa !== store.programa || estado !== store.estado;

  const carregarExemplo = (id: string) => {
    const ex = EXEMPLOS.find((e) => e.id === id);
    if (!ex) return;
    setPrograma(ex.programa);
    setEstado(ex.estado);
    store.carregar(ex.programa, ex.estado);
  };

  return (
    <div className="painel-editor">
      <label className="campo">
        <span>Exemplos</span>
        <select
          defaultValue=""
          onChange={(e) => carregarExemplo(e.target.value)}
          aria-label="Carregar exemplo"
        >
          <option value="" disabled>
            Escolha um exemplo…
          </option>
          {EXEMPLOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </select>
      </label>
      <label className="campo">
        <span>Programa (Assembly)</span>
        <textarea
          className="mono"
          rows={10}
          spellCheck={false}
          value={programa}
          onChange={(e) => setPrograma(e.target.value)}
          aria-label="Programa em Assembly"
        />
      </label>
      {store.asmErrors.length > 0 && (
        <ul className="erros" role="alert">
          {store.asmErrors.map((e, i) => (
            <li key={i}>{formatAsmError(e)}</li>
          ))}
        </ul>
      )}
      <label className="campo">
        <span>
          Estado inicial <small>($8 = 5, M[8] = 7 — uma atribuição por linha)</small>
        </span>
        <textarea
          className="mono"
          rows={5}
          spellCheck={false}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Estado inicial"
        />
      </label>
      {store.estadoErrors.length > 0 && (
        <ul className="erros" role="alert">
          {store.estadoErrors.map((e, i) => (
            <li key={i}>
              Linha {e.line}: {e.message}
            </li>
          ))}
        </ul>
      )}
      <div className="editor-acoes">
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => store.carregar(programa, estado)}
        >
          Montar e carregar{alterado ? ' *' : ''}
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            setCopiado((await onCopiarLink()) ? 'ok' : 'erro');
            setTimeout(() => setCopiado(null), 2500);
          }}
        >
          Copiar link
        </button>
        <span role="status" className="muted">
          {copiado === 'ok' && 'Link copiado.'}
          {copiado === 'erro' && 'Não deu para copiar; o link está na barra de endereço.'}
        </span>
      </div>
    </div>
  );
}
