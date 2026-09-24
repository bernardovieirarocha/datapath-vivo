import { useMemo, useState } from 'react';
import { compare } from '../../../core/faults';
import { computeActivity, exploreState, step, type Overrides } from '../../../core/mono';
import { descreverDiferencas } from '../../../content/efeitos';
import { motivoX, QUIZ } from '../../../content/quiz';
import { Datapath } from '../../datapath/Datapath';
import type { Formato } from '../../format';
import { InstrucaoAtual } from '../../panels/InstrucaoAtual';
import { lerInstrucao } from '../explorar/estado';
import { COLUNAS, corrigir, instrucaoAleatoria, opcoes, type Sinal } from './correcao';

type Respostas = Partial<Record<Sinal, string>>;

export function Quiz({ inicial, formato }: { inicial?: string; formato: Formato }) {
  const [texto, setTexto] = useState(() => {
    const r = inicial ? lerInstrucao(inicial) : undefined;
    return r?.ok ? r.texto : instrucaoAleatoria();
  });
  const [digitado, setDigitado] = useState('');
  const [erroDigitado, setErroDigitado] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [conferido, setConferido] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [placar, setPlacar] = useState({ acertos: 0, total: 0 });
  const [ver, setVer] = useState<'seus' | 'certo'>('seus');

  const lido = lerInstrucao(texto);
  const word = lido.ok ? lido.word : 0;
  const estado = useMemo(() => exploreState(word), [word]);
  const certo = useMemo(() => step(estado), [estado]);
  const opcode = certo.snapshot.wires['opcode']!;
  const mnemonic = certo.snapshot.decoded.ok ? certo.snapshot.decoded.instr.mnemonic : '?';

  const correcoes = COLUNAS.map((s) => ({
    s,
    r: respostas[s],
    c: respostas[s] === undefined ? undefined : corrigir(opcode, s, respostas[s]),
  }));
  const completo = correcoes.every((x) => x.r !== undefined);
  const erros = correcoes.filter((x) => x.c?.status === 'errado');

  const overridesSeus = useMemo(() => {
    const o: Record<string, () => number> = {};
    for (const s of COLUNAS) {
      const r = respostas[s];
      if (r !== undefined && r !== 'X') o[s] = () => parseInt(r, 2);
    }
    return o as Overrides;
  }, [respostas]);
  const seus = useMemo(() => step(estado, { overrides: overridesSeus }), [estado, overridesSeus]);
  const mostrado = ver === 'seus' ? seus : certo;
  const activity = useMemo(() => computeActivity(mostrado.snapshot), [mostrado]);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const novaInstrucao = (t: string) => {
    setTexto(t);
    setRespostas({});
    setConferido(false);
    setRevelado(false);
    setVer('seus');
  };

  const conferir = () => {
    if (!conferido && !revelado) {
      setPlacar((p) => ({ acertos: p.acertos + (erros.length === 0 ? 1 : 0), total: p.total + 1 }));
    }
    setConferido(true);
  };

  const revelar = () => {
    const r: Respostas = {};
    for (const s of COLUNAS) {
      const c = corrigir(opcode, s, '?');
      r[s] = c.status === 'certo' ? 'X' : c.esperado;
    }
    setRespostas(r);
    setRevelado(true);
    setConferido(true);
  };

  const consequencia = (s: Sinal, valor: number | undefined, esperado: string): string => {
    if (valor === undefined) {
      if (s === 'ALUOp') return `${QUIZ.xErrado}a ULA faria outra operação.`;
      const outro = 1 - Number(esperado);
      const d = descreverDiferencas(compare(estado, { [s]: () => outro }).differences);
      return QUIZ.xErrado + (d[0] ?? 'o resultado mudaria.');
    }
    const d = descreverDiferencas(compare(estado, { [s]: () => valor }).differences);
    const v = s === 'ALUOp' ? valor.toString(2).padStart(2, '0') : String(valor);
    return d.length === 0 ? QUIZ.semEfeito : `Com ${s} = ${v}: ${d.join(' Além disso, ')}`;
  };

  return (
    <div className="quiz">
      <div className="quiz-topo">
        <div>
          <h2>{QUIZ.titulo}</h2>
          <p className="muted">
            {QUIZ.instrucoes} <small>({QUIZ.origem})</small>
          </p>
        </div>
        <p className="placar" aria-live="polite">
          Acertos: <strong>{placar.acertos}</strong> de {placar.total}
        </p>
      </div>

      <div className="status-ciclo quiz-instr">
        <InstrucaoAtual snapshot={certo.snapshot} />
      </div>

      <div className="quiz-sinais" role="group" aria-label="Sinais de controle">
        {correcoes.map(({ s, r, c }) => (
          <fieldset
            key={s}
            className={`quiz-sinal ${conferido && c ? `quiz-${c.status}` : ''}`}
            data-sinal={s}
          >
            <legend className="mono">{s}</legend>
            <div className="seg">
              {opcoes(s).map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`seg-btn mono ${r === o ? 'seg-on' : ''}`}
                  aria-pressed={r === o}
                  aria-label={`${s} = ${o}`}
                  onClick={() => {
                    setRespostas((x) => ({ ...x, [s]: o }));
                    setConferido(false);
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
            {conferido && c && (
              <span className="quiz-marca" aria-label={c.status === 'certo' ? 'certo' : 'errado'}>
                {c.status === 'certo' ? '✓' : `✗ era ${c.esperado}`}
              </span>
            )}
          </fieldset>
        ))}
      </div>

      <div className="quiz-acoes">
        <button type="button" className="btn btn-primario" disabled={!completo} onClick={conferir}>
          Conferir
        </button>
        <button type="button" className="btn" onClick={revelar}>
          Mostrar resposta
        </button>
        <button type="button" className="btn" onClick={() => novaInstrucao(instrucaoAleatoria())}>
          Próxima instrução →
        </button>
        <form
          className="quiz-digitar"
          onSubmit={(e) => {
            e.preventDefault();
            const r = lerInstrucao(digitado);
            if (r.ok) {
              setErroDigitado(null);
              novaInstrucao(r.texto);
            } else setErroDigitado(r.erro);
          }}
        >
          <input
            className="mono"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            placeholder="ou digite uma instrução"
            aria-label="Instrução para o quiz"
          />
          <button type="submit" className="btn">
            Usar
          </button>
        </form>
      </div>
      {erroDigitado && (
        <p className="erro-instr" role="alert">
          {erroDigitado}
        </p>
      )}

      {conferido && (
        <section className="quiz-feedback" aria-label="Correção">
          {revelado ? (
            <p>Resposta da tabela do slide. Veja abaixo o datapath com esses sinais.</p>
          ) : erros.length === 0 ? (
            <p className="quiz-ok">
              Tudo certo! {mnemonic} configurado como na tabela do controle.
            </p>
          ) : (
            <ul className="quiz-erros">
              {erros.map(({ s, c }) =>
                c?.status === 'errado' ? (
                  <li key={s}>
                    <strong className="mono">{s}</strong> deveria ser {c.esperado}.{' '}
                    {consequencia(s, c.valor, c.esperado)}
                  </li>
                ) : null,
              )}
            </ul>
          )}
          {correcoes.some((x) => x.c?.status === 'certo' && x.c.dontCare) && (
            <ul className="quiz-xs muted">
              {correcoes
                .filter((x) => x.c?.status === 'certo' && x.c.dontCare)
                .map((x) => (
                  <li key={x.s}>
                    <span className="mono">{x.s}</span> — {motivoX(x.s, mnemonic)}
                  </li>
                ))}
            </ul>
          )}

          <div className="quiz-ver" role="group" aria-label="Qual datapath mostrar">
            <button
              type="button"
              className={`chip-btn ${ver === 'seus' ? 'chip-btn-on' : ''}`}
              onClick={() => setVer('seus')}
            >
              Com os seus sinais
            </button>
            <button
              type="button"
              className={`chip-btn ${ver === 'certo' ? 'chip-btn-on' : ''}`}
              onClick={() => setVer('certo')}
            >
              Com os sinais certos
            </button>
          </div>
          <div className="rolavel">
            <Datapath
              wires={mostrado.snapshot.wires}
              activity={activity}
              fase={5}
              formato={formato}
              selecionado={selecionado}
              onSelect={(id) => setSelecionado((x) => (x === id ? null : id))}
              destaque={ver === 'seus' ? new Set(erros.map((e) => e.s)) : undefined}
            />
          </div>
        </section>
      )}
      {!conferido && <p className="muted">Confira para ver o datapath com os seus sinais.</p>}
    </div>
  );
}
