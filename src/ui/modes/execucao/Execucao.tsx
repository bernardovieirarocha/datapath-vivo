import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeActivity } from '../../../core/mono';
import { FASES, textoAlerta } from '../../../content/textos';
import { Datapath } from '../../datapath/Datapath';
import { Editor } from '../../panels/Editor';
import { InfoBloco } from '../../panels/InfoBloco';
import { InstrucaoAtual } from '../../panels/InstrucaoAtual';
import { MemoriaDados } from '../../panels/MemoriaDados';
import { MemoriaInstrucoes } from '../../panels/MemoriaInstrucoes';
import { Registradores } from '../../panels/Registradores';
import { Sinais } from '../../panels/Sinais';
import { ModoTabs } from '../../ModoTabs';
import { TemaToggle } from '../../TemaToggle';
import { encodeCompartilhado } from './link';
import { atual, NUM_FASES, useExecucao } from './store';

type Aba = 'registradores' | 'dados' | 'instrucoes' | 'sinais' | 'programa';

const ABAS: { id: Aba; nome: string }[] = [
  { id: 'registradores', nome: 'Registradores' },
  { id: 'dados', nome: 'Dados' },
  { id: 'instrucoes', nome: 'Instruções' },
  { id: 'sinais', nome: 'Controle' },
  { id: 'programa', nome: 'Programa' },
];

function linkAtual(programa: string, estado: string): string {
  const base = `${location.origin}${location.pathname}${location.search}`;
  return `${base}#/m1/programa?p=${encodeCompartilhado({ programa, estado })}`;
}

export function Execucao() {
  const st = useExecucao();
  const { estado, resultado } = atual(st);
  const snapshot = resultado.snapshot;
  const activity = useMemo(() => computeActivity(snapshot), [snapshot]);
  const [aba, setAba] = useState<Aba>('registradores');
  const fase = st.emFases ? st.fase : NUM_FASES;
  const cicloNum = estado.cycle - st.history[0]!.cycle;
  const [irPara, setIrPara] = useState('');

  // Rodar: um passo (ou uma fase) por tick; para no breakpoint.
  useEffect(() => {
    if (!st.rodando) return;
    const id = setInterval(() => {
      const s = useExecucao.getState();
      s.passo();
      const n = useExecucao.getState();
      const inicioDeCiclo = !n.emFases || n.fase === 1;
      if (inicioDeCiclo && n.breakpoints.includes(n.history[n.cursor]!.pc)) n.setRodando(false);
    }, 1000 / st.velocidade);
    return () => clearInterval(id);
  }, [st.rodando, st.velocidade]);

  // Atualiza o link na barra de endereço quando o programa carregado muda.
  useEffect(() => {
    if (st.asmErrors.length === 0 && st.estadoErrors.length === 0) {
      window.history.replaceState(null, '', linkAtual(st.programa, st.estado));
    }
  }, [st.programa, st.estado, st.asmErrors.length, st.estadoErrors.length]);

  // Atalhos: → passo, ← volta, Espaço rodar/pausar, R reinicia, H hex/dec, F fases, Esc fecha painel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useExecucao.getState();
      switch (e.key) {
        case 'ArrowRight':
          s.setRodando(false);
          s.passo();
          break;
        case 'ArrowLeft':
          s.setRodando(false);
          s.voltar();
          break;
        case ' ':
          if (alvo?.closest('button, [role="button"]')) return;
          s.setRodando(!s.rodando);
          break;
        case 'r':
        case 'R':
          s.reiniciar();
          break;
        case 'h':
        case 'H':
          s.setFormato(s.formato === 'dec' ? 'hex' : 'dec');
          break;
        case 'f':
        case 'F':
          s.setEmFases(!s.emFases);
          break;
        case 'Escape':
          s.selecionar(null);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const copiarLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(linkAtual(st.programa, st.estado));
      return true;
    } catch {
      return false;
    }
  }, [st.programa, st.estado]);

  const mostrarEscrita = fase >= NUM_FASES;

  return (
    <div className="execucao">
      <header className="barra">
        <a href="#/" className="marca">
          Datapath Vivo
        </a>
        <ModoTabs atual="programa" />
        <div className="controles" role="toolbar" aria-label="Controles da simulação">
          <button
            type="button"
            className="btn"
            onClick={st.reiniciar}
            title="Voltar ao estado inicial (R)"
          >
            ⟲ Reiniciar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              st.setRodando(false);
              st.voltar();
            }}
            disabled={st.cursor === 0 && fase <= 1}
            title="Voltar (←)"
          >
            ← Voltar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => {
              st.setRodando(false);
              st.passo();
            }}
            title="Passo (→)"
          >
            {st.emFases ? 'Próxima fase →' : 'Passo →'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => st.setRodando(!st.rodando)}
            aria-pressed={st.rodando}
            title="Rodar / pausar (Espaço)"
          >
            {st.rodando ? '❚❚ Pausar' : '▶ Rodar'}
          </button>
          <label className="velocidade">
            <span>Velocidade</span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={st.velocidade}
              onChange={(e) => st.setVelocidade(Number(e.target.value))}
              aria-label="Passos por segundo"
            />
          </label>
          <form
            className="ir-para"
            onSubmit={(e) => {
              e.preventDefault();
              if (irPara.trim() !== '') st.irPara(Number(irPara));
            }}
          >
            <label>
              <span>Ir ao ciclo</span>
              <input
                type="number"
                min={0}
                value={irPara}
                onChange={(e) => setIrPara(e.target.value)}
                aria-label="Número do ciclo"
              />
            </label>
          </form>
        </div>
        <div className="opcoes">
          <label className="toggle">
            <input
              type="checkbox"
              checked={st.emFases}
              onChange={(e) => st.setEmFases(e.target.checked)}
            />{' '}
            Fases do ciclo <kbd>F</kbd>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={st.formato === 'hex'}
              onChange={(e) => st.setFormato(e.target.checked ? 'hex' : 'dec')}
            />{' '}
            Hex <kbd>H</kbd>
          </label>
          <TemaToggle />
        </div>
      </header>

      <main className="execucao-corpo">
        <section className="palco" aria-label="Datapath">
          <div className="status-ciclo">
            <span className="ciclo" data-testid="ciclo">
              Ciclo {cicloNum + 1}
            </span>
            <span className="mono">PC = {estado.pc}</span>
            <InstrucaoAtual snapshot={snapshot} />
          </div>
          <ol className="fases" aria-label="Fases do ciclo">
            {FASES.map((f, i) => (
              <li
                key={f.nome}
                className={
                  i + 1 === fase && st.emFases ? 'fase-atual' : i + 1 <= fase ? 'fase-feita' : ''
                }
                title={f.descricao}
              >
                {i + 1}. {f.nome}
              </li>
            ))}
          </ol>
          {st.emFases && <p className="fase-desc">{FASES[fase - 1]!.descricao}</p>}
          <Datapath
            wires={snapshot.wires}
            activity={activity}
            fase={fase}
            formato={st.formato}
            selecionado={st.selecionado}
            onSelect={(id) => st.selecionar(st.selecionado === id ? null : id)}
          />
          {snapshot.alerts.length > 0 && (
            <ul className="alertas" role="status">
              {snapshot.alerts.map((a, i) => (
                <li key={i}>⚠ {textoAlerta(a.code, a.value)}</li>
              ))}
            </ul>
          )}
          <p className="legenda-cores">
            <span className="leg leg-dados">dados</span>
            <span className="leg leg-endereco">endereços</span>
            <span className="leg leg-instrucao">campos da instrução</span>
            <span className="leg leg-controle">controle</span>
            <span className="leg leg-inativo">não influencia este ciclo</span>
            <span className="muted">Clique num bloco para ver o que ele faz.</span>
          </p>
        </section>

        <aside className="lateral">
          {st.selecionado ? (
            <InfoBloco
              id={st.selecionado}
              snapshot={snapshot}
              onClose={() => st.selecionar(null)}
            />
          ) : (
            <>
              <div className="abas" role="tablist" aria-label="Painéis">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    id={`aba-${a.id}`}
                    aria-selected={aba === a.id}
                    aria-controls={`painel-${a.id}`}
                    className="aba"
                    onClick={() => setAba(a.id)}
                  >
                    {a.nome}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`painel-${aba}`}
                aria-labelledby={`aba-${aba}`}
                className="painel"
              >
                {aba === 'registradores' && (
                  <Registradores
                    estado={estado}
                    snapshot={snapshot}
                    activity={activity}
                    mostrarEscrita={mostrarEscrita}
                    formato={st.formato}
                  />
                )}
                {aba === 'dados' && (
                  <MemoriaDados
                    estado={estado}
                    snapshot={snapshot}
                    mostrarEscrita={mostrarEscrita}
                    formato={st.formato}
                  />
                )}
                {aba === 'instrucoes' && (
                  <MemoriaInstrucoes
                    estado={estado}
                    linhas={st.linhas}
                    breakpoints={st.breakpoints}
                    onBreakpoint={st.alternarBreakpoint}
                  />
                )}
                {aba === 'sinais' && <Sinais snapshot={snapshot} />}
                {aba === 'programa' && <Editor onCopiarLink={copiarLink} />}
              </div>
            </>
          )}
        </aside>
      </main>
      <footer className="atalhos muted">
        Atalhos: <kbd>→</kbd> passo · <kbd>←</kbd> volta · <kbd>Espaço</kbd> rodar/pausar ·{' '}
        <kbd>R</kbd> reiniciar · <kbd>H</kbd> hex/dec · <kbd>F</kbd> fases · <kbd>Esc</kbd> fecha a
        explicação
      </footer>
    </div>
  );
}
