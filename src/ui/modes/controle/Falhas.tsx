import { useMemo, useState } from 'react';
import {
  FAULTABLE,
  outcomeOf,
  runFaultCases,
  type Fault,
  type FaultWire,
} from '../../../core/faults';
import { computeActivity } from '../../../core/mono';
import { descreverDiferencas, descreverResultado } from '../../../content/efeitos';
import { Datapath } from '../../datapath/Datapath';
import type { Formato } from '../../format';

const nomeValor = (w: FaultWire, v: number) =>
  w === 'ALUOp' ? v.toString(2).padStart(2, '0') : String(v);

/** "E se?": injeção de falhas (stuck-at e Zero invertido) em todas as classes de instrução. */
export function Falhas({ formato }: { formato: Formato }) {
  const [wire, setWire] = useState<FaultWire>('MemtoReg');
  const [modo, setModo] = useState<'stuck' | 'invert'>('stuck');
  const [valor, setValor] = useState(1);
  const [casoId, setCasoId] = useState<string | null>(null);
  const [ver, setVer] = useState<'falha' | 'certo'>('falha');

  const resultados = useMemo(() => {
    const falha: Fault =
      modo === 'invert' ? { wire, mode: 'invert' } : { wire, mode: 'stuck', value: valor };
    return runFaultCases([falha]);
  }, [wire, modo, valor]);
  const falham = resultados.filter((r) => !r.works);
  const funcionam = resultados.filter((r) => r.works);
  const sel = resultados.find((r) => r.case.id === casoId) ?? falham[0] ?? resultados[0]!;
  const mostrado = ver === 'falha' ? sel.comparison.faulty : sel.comparison.correct;
  const activity = computeActivity(mostrado.snapshot);

  const valores = wire === 'ALUOp' ? [0, 1, 2, 3] : [0, 1];
  const pergunta =
    modo === 'invert'
      ? `O que acontece se o sinal ${wire} for invertido?`
      : `O que acontece se o sinal ${wire} ficar preso em ${nomeValor(wire, valor)}?`;

  return (
    <div className="falhas">
      <div className="falha-controles" role="group" aria-label="Falha">
        <label className="campo">
          <span>Sinal</span>
          <select
            value={wire}
            onChange={(e) => {
              const w = e.target.value as FaultWire;
              setWire(w);
              setValor(w === 'ALUOp' ? 0 : 1);
              setCasoId(null);
            }}
            aria-label="Sinal com falha"
          >
            {FAULTABLE.map((w) => (
              <option key={w} value={w}>
                {w === 'zero' ? 'Zero (saída da ULA)' : w}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label="Tipo de falha">
          {valores.map((v) => (
            <button
              key={v}
              type="button"
              className={`seg-btn ${modo === 'stuck' && valor === v ? 'seg-on' : ''}`}
              aria-pressed={modo === 'stuck' && valor === v}
              onClick={() => {
                setModo('stuck');
                setValor(v);
                setCasoId(null);
              }}
            >
              preso em {nomeValor(wire, v)}
            </button>
          ))}
          <button
            type="button"
            className={`seg-btn ${modo === 'invert' ? 'seg-on' : ''}`}
            aria-pressed={modo === 'invert'}
            onClick={() => {
              setModo('invert');
              setCasoId(null);
            }}
          >
            invertido
          </button>
        </div>
      </div>

      <h2 className="falha-pergunta">{pergunta}</h2>
      <p data-testid="resumo-falha">
        {falham.length === 0 ? (
          <>Nenhuma instrução muda de resultado.</>
        ) : (
          <>
            Passam a falhar: <strong>{falham.map((r) => r.case.label).join(', ')}</strong>.
          </>
        )}{' '}
        {funcionam.length > 0 && falham.length > 0 && (
          <>Continuam certas: {funcionam.map((r) => r.case.label).join(', ')}.</>
        )}
      </p>

      <div className="tabela-rolavel">
        <table className="tabela-falhas">
          <thead>
            <tr>
              <th>Instrução</th>
              <th>Deveria</th>
              <th>Com a falha</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr
                key={r.case.id}
                className={`${r.works ? 'linha-ok' : 'linha-falha'} ${r === sel ? 'linha-acesa' : ''}`}
                data-caso={r.case.id}
              >
                <th scope="row">
                  <button
                    type="button"
                    className="link-btn mono"
                    onClick={() => setCasoId(r.case.id)}
                  >
                    {r.case.asm}
                  </button>
                  {r.case.label.includes('(') && (
                    <small className="muted">
                      {' '}
                      {r.case.label.slice(r.case.label.indexOf('('))}
                    </small>
                  )}
                </th>
                <td className="mono">{descreverResultado(outcomeOf(r.comparison.correct))}</td>
                <td>
                  {r.works ? (
                    <span className="ok">✓ igual</span>
                  ) : (
                    <span className="falha">
                      ✗ {descreverDiferencas(r.comparison.differences).join(' ')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quiz-ver" role="group" aria-label="Qual datapath mostrar">
        <span className="mono">{sel.case.asm}:</span>
        <button
          type="button"
          className={`chip-btn ${ver === 'falha' ? 'chip-btn-on' : ''}`}
          onClick={() => setVer('falha')}
        >
          Com a falha
        </button>
        <button
          type="button"
          className={`chip-btn ${ver === 'certo' ? 'chip-btn-on' : ''}`}
          onClick={() => setVer('certo')}
        >
          Sem falha
        </button>
      </div>
      <div className="rolavel">
        <Datapath
          wires={mostrado.snapshot.wires}
          activity={activity}
          fase={5}
          formato={formato}
          selecionado={null}
          onSelect={() => {}}
          destaque={new Set([wire])}
        />
      </div>
    </div>
  );
}
