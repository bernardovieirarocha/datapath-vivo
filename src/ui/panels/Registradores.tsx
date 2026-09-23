import { REGISTER_NAMES } from '../../core/isa';
import type { MonoState, Snapshot, Activity } from '../../core/mono';
import { formatar, type Formato } from '../format';

interface Props {
  estado: MonoState;
  snapshot: Snapshot;
  activity: Activity;
  /** A escrita só "aparece" na fase de escrita. */
  mostrarEscrita: boolean;
  formato: Formato;
}

export function Registradores({ estado, snapshot, activity, mostrarEscrita, formato }: Props) {
  const w = snapshot.wires;
  const lidos = new Set<number>();
  if (activity.wires.has('rd1')) lidos.add(w['rs']!);
  if (activity.wires.has('rd2')) lidos.add(w['rt']!);
  const escrita = mostrarEscrita ? snapshot.writes.reg : undefined;
  return (
    <div className="painel-registradores">
      <p className="painel-legenda">
        <span className="chip chip-lido">lido</span>{' '}
        <span className="chip chip-escrito">será escrito na borda</span>
      </p>
      <ol className="regs">
        {estado.regs.map((v, i) => {
          const cls = [
            'reg',
            lidos.has(i) ? 'reg-lido' : '',
            escrita?.index === i ? 'reg-escrito' : '',
            v === 0 && escrita?.index !== i ? 'reg-zero' : '',
          ].join(' ');
          return (
            <li key={i} className={cls} data-reg={i}>
              <span className="reg-nome">
                ${i} <small>${REGISTER_NAMES[i]}</small>
              </span>
              <span className="reg-valor">
                <span className="reg-atual">{formatar(v, 32, 'dados', formato)}</span>
                {escrita?.index === i && (
                  <span className="reg-novo">
                    {' '}
                    → {formatar(escrita.after, 32, 'dados', formato)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
