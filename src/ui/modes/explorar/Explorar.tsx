import { useEffect, useMemo, useState } from 'react';
import { computeActivity, inDmem, MONO_NETLIST, step, wordAddress } from '../../../core/mono';
import { narrar } from '../../../content/narracao';
import { textoAlerta } from '../../../content/textos';
import { Datapath } from '../../datapath/Datapath';
import { formatar, type Formato } from '../../format';
import { InfoBloco } from '../../panels/InfoBloco';
import { InstrucaoAtual } from '../../panels/InstrucaoAtual';
import { Sinais } from '../../panels/Sinais';
import { ModoTabs } from '../../ModoTabs';
import { TemaToggle } from '../../TemaToggle';
import { ATALHOS, lerInstrucao, lerValor, montarEstado } from './estado';

const WIRE = new Map(MONO_NETLIST.wires.map((w) => [w.id, w]));
const NUM_FASES = 5;

interface Props {
  /** Instrução inicial (vinda do link). */
  inicial?: string;
}

/** "Explorar instrução": o aluno digita uma instrução e vê o datapath dela na hora. */
export function Explorar({ inicial }: Props) {
  const [texto, setTexto] = useState(inicial ?? ATALHOS[6]!);
  const [ultimaValida, setUltimaValida] = useState(() => {
    const r = lerInstrucao(inicial ?? ATALHOS[6]!);
    return r.ok ? r : (lerInstrucao(ATALHOS[0]!) as Extract<typeof r, { ok: true }>);
  });
  const [pc, setPc] = useState(0);
  const [regs, setRegs] = useState<Record<number, number>>({});
  const [mem, setMem] = useState<Record<number, number>>({});
  const [fase, setFase] = useState<number | null>(null); // null = ciclo inteiro
  const [formato, setFormato] = useState<Formato>('dec');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const lido = useMemo(() => lerInstrucao(texto), [texto]);
  const mudarTexto = (t: string) => {
    setTexto(t);
    setSelecionado(null);
    const r = lerInstrucao(t);
    if (r.ok) setUltimaValida(r);
  };
  const instr = lido.ok ? lido : ultimaValida;

  const estado = useMemo(
    () => montarEstado(instr.word, pc, regs, mem),
    [instr.word, pc, regs, mem],
  );
  const { snapshot } = useMemo(() => step(estado), [estado]);
  const activity = useMemo(() => computeActivity(snapshot), [snapshot]);
  const w = snapshot.wires;
  const v = (id: string) => {
    const spec = WIRE.get(id)!;
    return formatar(w[id]!, spec.width, spec.kind, formato);
  };
  const etapas = narrar(snapshot, v);
  const faseVisivel = fase ?? NUM_FASES;

  // Link compartilhável da instrução.
  useEffect(() => {
    if (lido.ok) {
      const url = `${location.pathname}${location.search}#/m1?i=${encodeURIComponent(texto.trim())}`;
      window.history.replaceState(null, '', url);
    }
  }, [lido.ok, texto]);

  // ← → andam pelas etapas; Esc volta ao ciclo inteiro / fecha a explicação; H hex/dec.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') setFase((f) => (f === null ? 1 : Math.min(NUM_FASES, f + 1)));
      else if (e.key === 'ArrowLeft') setFase((f) => (f === null ? NUM_FASES : Math.max(1, f - 1)));
      else if (e.key === 'Escape') {
        setSelecionado(null);
        setFase(null);
      } else if (e.key === 'h' || e.key === 'H') setFormato((f) => (f === 'dec' ? 'hex' : 'dec'));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Valores que o aluno pode mexer: só o que a instrução usa.
  const usaRs = activity.wires.has('rd1') && w['rs'] !== 0;
  const usaRt = activity.wires.has('rd2') && w['rt'] !== 0;
  const endereco = wordAddress(w['alu_result']!);
  const usaMem = w['MemRead'] === 1 && inDmem(w['alu_result']!);
  const valorReg = (n: number) => estado.regs[n]!;

  const wr = snapshot.writes;

  return (
    <div className="execucao explorar">
      <header className="barra">
        <a href="#/" className="marca">
          Datapath Vivo
        </a>
        <ModoTabs atual="instrucao" />
        <div className="opcoes">
          <label className="toggle">
            <input
              type="checkbox"
              checked={formato === 'hex'}
              onChange={(e) => setFormato(e.target.checked ? 'hex' : 'dec')}
            />{' '}
            Hex <kbd>H</kbd>
          </label>
          <TemaToggle />
        </div>
      </header>

      <main className="execucao-corpo">
        <section className="palco" aria-label="Instrução e datapath">
          <div className="entrada-instr">
            <label htmlFor="instrucao">Digite uma instrução</label>
            <input
              id="instrucao"
              className={`mono ${lido.ok ? '' : 'invalida'}`}
              value={texto}
              onChange={(e) => mudarTexto(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!lido.ok}
              aria-describedby="instr-msg"
              placeholder="ex.: lw $t0, 8($s1)  ou  0x8E280008"
            />
            <p
              id="instr-msg"
              className={lido.ok ? 'muted' : 'erro-instr'}
              role={lido.ok ? undefined : 'alert'}
            >
              {lido.ok
                ? 'Assembly (add, sub, and, or, slt, addi, lw, sw, beq, j) ou os 32 bits em hex.'
                : `${lido.erro} Mostrando a última instrução válida: ${ultimaValida.texto}.`}
            </p>
            <div className="atalhos-instr" role="group" aria-label="Exemplos">
              {ATALHOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip-btn mono ${texto.trim() === a ? 'chip-btn-on' : ''}`}
                  onClick={() => mudarTexto(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="status-ciclo">
            <InstrucaoAtual snapshot={snapshot} />
          </div>

          <div className="valores" role="group" aria-label="Valores antes da instrução">
            <span className="valores-titulo">Valores antes da instrução:</span>
            <CampoValor
              rotulo="PC"
              valor={pc}
              formato={formato}
              passo4
              onChange={(x) => setPc(x)}
            />
            {usaRs && (
              <CampoValor
                rotulo={`$${w['rs']} (rs)`}
                valor={valorReg(w['rs']!)}
                formato={formato}
                onChange={(x) => setRegs((r) => ({ ...r, [w['rs']!]: x }))}
              />
            )}
            {usaRt && w['rt'] !== w['rs'] && (
              <CampoValor
                rotulo={`$${w['rt']} (rt)`}
                valor={valorReg(w['rt']!)}
                formato={formato}
                onChange={(x) => setRegs((r) => ({ ...r, [w['rt']!]: x }))}
              />
            )}
            {usaMem && (
              <CampoValor
                rotulo={`M[${endereco}]`}
                valor={w['mem_read_data']!}
                formato={formato}
                onChange={(x) => setMem((m) => ({ ...m, [endereco]: x }))}
              />
            )}
          </div>

          <div className="fases-nav" role="group" aria-label="Etapas do ciclo">
            <button
              type="button"
              className={`chip-btn ${fase === null ? 'chip-btn-on' : ''}`}
              onClick={() => setFase(null)}
            >
              Ciclo inteiro
            </button>
            {etapas.map((e) => (
              <button
                key={e.fase}
                type="button"
                className={`chip-btn ${fase === e.fase ? 'chip-btn-on' : ''}`}
                onClick={() => setFase(e.fase)}
                aria-pressed={fase === e.fase}
              >
                {e.fase}. {e.titulo}
              </button>
            ))}
            <span className="muted dica">
              <kbd>←</kbd> <kbd>→</kbd> andam pelas etapas
            </span>
          </div>

          <Datapath
            wires={w}
            activity={activity}
            fase={faseVisivel}
            formato={formato}
            selecionado={selecionado}
            onSelect={(id) => setSelecionado((s) => (s === id ? null : id))}
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
            <span className="leg leg-inativo">não é usado por esta instrução</span>
            <span className="muted">Clique num bloco para ver o que ele faz.</span>
          </p>
        </section>

        <aside className="lateral">
          {selecionado ? (
            <InfoBloco id={selecionado} snapshot={snapshot} onClose={() => setSelecionado(null)} />
          ) : (
            <div className="painel">
              <h2 className="painel-titulo">O que acontece</h2>
              <ol className="narracao">
                {etapas.map((e) => (
                  <li
                    key={e.fase}
                    className={
                      fase === e.fase
                        ? 'etapa-atual'
                        : fase !== null && e.fase > fase
                          ? 'etapa-futura'
                          : ''
                    }
                  >
                    <button type="button" className="etapa-titulo" onClick={() => setFase(e.fase)}>
                      {e.fase}. {e.titulo}
                    </button>
                    <ul>
                      {e.itens.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <h2 className="painel-titulo">Resultado (na borda do clock)</h2>
              <ul className="resultado mono" data-testid="resultado">
                {wr.reg && (
                  <li>
                    ${wr.reg.index} ← {formatar(wr.reg.after, 32, 'dados', formato)}
                  </li>
                )}
                {wr.mem && (
                  <li>
                    M[{wr.mem.address}] ← {formatar(w['rd2']!, 32, 'dados', formato)}
                  </li>
                )}
                <li>PC ← {formatar(wr.pc.after, 32, 'endereco', formato)}</li>
              </ul>
              <details className="sinais-detalhe">
                <summary>Tabela dos sinais de controle</summary>
                <Sinais snapshot={snapshot} />
              </details>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

interface CampoProps {
  rotulo: string;
  valor: number;
  formato: Formato;
  passo4?: boolean;
  onChange: (v: number) => void;
}

/** Campo de valor editável (aceita decimal com sinal, 0x… e 0b…). */
function CampoValor({ rotulo, valor, formato, passo4, onChange }: CampoProps) {
  const mostrado = formatar(valor, 32, passo4 ? 'endereco' : 'dados', formato);
  const [rascunho, setRascunho] = useState(mostrado);
  // Ajuste durante o render (sem efeito): se o valor ou o formato mudaram por fora,
  // o campo passa a mostrar o novo valor — a menos que o rascunho já represente esse valor
  // (assim digitar "0x10" num campo em decimal não é interrompido no meio).
  const [base, setBase] = useState({ valor, formato });
  if (base.valor !== valor || base.formato !== formato) {
    setBase({ valor, formato });
    if (base.formato !== formato || lerValor(rascunho) !== valor) setRascunho(mostrado);
  }
  const parsed = lerValor(rascunho);
  const invalido = parsed === undefined || (passo4 === true && parsed % 4 !== 0);
  return (
    <label className="campo-valor">
      <span className="mono">{rotulo} =</span>
      <input
        className={`mono ${invalido ? 'invalida' : ''}`}
        value={rascunho}
        aria-label={`Valor de ${rotulo}`}
        aria-invalid={invalido}
        title={passo4 ? 'Múltiplo de 4' : 'Decimal (com sinal), 0x… ou 0b…'}
        onChange={(e) => {
          setRascunho(e.target.value);
          const x = lerValor(e.target.value);
          if (x !== undefined && (!passo4 || x % 4 === 0)) onChange(x);
        }}
      />
    </label>
  );
}
