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
        Sinais do controle para <strong className="mono">{nome}</strong> (opcode{' '}
        <span className="mono">{bin(w['opcode']!, 6)}</span>).
      </p>
      <table className="sinais">
        <tbody>
          {CONTROL_SIGNAL_NAMES.map((s) => {
            const v = w[s]!;
            const x = xs.includes(s);
            return (
              <tr key={s} title={SINAIS[s]}>
                <th scope="row" className="mono">
                  {s}
                </th>
                <td className={`mono sinal-${v ? 'on' : 'off'}`}>
                  {s === 'ALUOp' ? bin(v, 2) : v}
                </td>
                <td>
                  {x && (
                    <span
                      className="chip chip-x"
                      title="Don't care: no slide aparece X; o simulador usa 0"
                    >
                      X no slide
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr title="Linhas de controle da ULA (3 bits), geradas por ALUOp e funct">
            <th scope="row" className="mono">
              Controle da ULA
            </th>
            <td className="mono">{bin(w['alu_ctl']!, 3)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
