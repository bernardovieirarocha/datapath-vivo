import { bin } from '../../core/bits';
import { CONTROL_SIGNAL_NAMES, DONT_CARES, type Snapshot } from '../../core/mono';
import { SINAIS } from '../../content/textos';

export function Sinais({ snapshot }: { snapshot: Snapshot }) {
  const w = snapshot.wires;
  const xs = DONT_CARES[w['opcode']!] ?? [];
  const nome = snapshot.decoded.ok ? snapshot.decoded.instr.mnemonic : 'desconhecida';
  return (
    <div className="painel-sinais">
      <p className="painel-legenda">
        Sinais de controle gerados para a instrução <strong className="mono">{nome}</strong> (opcode{' '}
        <span className="mono">{bin(w['opcode']!, 6)}</span>).
      </p>
      <table className="sinais">
        <tbody>
          {CONTROL_SIGNAL_NAMES.map((s) => {
            const v = w[s]!;
            const x = xs.includes(s);
            return (
              <tr key={s}>
                <th scope="row" className="mono">
                  {s}
                </th>
                <td className={`mono sinal-${v ? 'on' : 'off'}`}>
                  {s === 'ALUOp' ? bin(v, 2) : v}
                  {x && (
                    <span
                      className="chip chip-x"
                      title="Don't care: no slide aparece X; o simulador usa 0"
                    >
                      X no slide
                    </span>
                  )}
                </td>
                <td className="sinal-desc">{SINAIS[s]}</td>
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="mono">
              Controle da ULA
            </th>
            <td className="mono">{bin(w['alu_ctl']!, 3)}</td>
            <td className="sinal-desc">
              3 linhas geradas por ALUOp e funct: 000 and · 001 or · 010 soma · 110 subtração · 111
              slt.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
