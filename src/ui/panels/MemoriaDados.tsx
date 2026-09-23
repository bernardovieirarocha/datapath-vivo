import { useState } from 'react';
import { hex } from '../../core/bits';
import { dmemWord, DMEM_BYTES, wordAddress, type MonoState, type Snapshot } from '../../core/mono';
import { formatar, type Formato } from '../format';

interface Props {
  estado: MonoState;
  snapshot: Snapshot;
  mostrarEscrita: boolean;
  formato: Formato;
}

export function MemoriaDados({ estado, snapshot, mostrarEscrita, formato }: Props) {
  const [porByte, setPorByte] = useState(false);
  const [soUsadas, setSoUsadas] = useState(true);
  const w = snapshot.wires;
  const acessa = w['MemRead'] === 1 || w['MemWrite'] === 1;
  const acessada = acessa ? wordAddress(w['alu_result']!) : -1;
  const escrita = mostrarEscrita ? snapshot.writes.mem : undefined;

  const palavras: number[] = [];
  for (let a = 0; a < DMEM_BYTES; a += 4) {
    const usada = [0, 1, 2, 3].some((k) => estado.dmem[a + k] !== 0);
    if (!soUsadas || usada || a === acessada) palavras.push(a);
  }

  return (
    <div className="painel-memoria">
      <div className="painel-opcoes">
        <label>
          <input type="checkbox" checked={porByte} onChange={(e) => setPorByte(e.target.checked)} />{' '}
          ver bytes (little-endian)
        </label>
        <label>
          <input
            type="checkbox"
            checked={soUsadas}
            onChange={(e) => setSoUsadas(e.target.checked)}
          />{' '}
          só palavras não nulas
        </label>
      </div>
      {palavras.length === 0 && <p className="vazio">Memória toda em 0.</p>}
      <table className="mem">
        <thead>
          <tr>
            <th>Endereço</th>
            {porByte ? (
              <>
                <th>+0</th>
                <th>+1</th>
                <th>+2</th>
                <th>+3</th>
              </>
            ) : (
              <th>Palavra</th>
            )}
          </tr>
        </thead>
        <tbody>
          {palavras.map((a) => {
            const novo =
              escrita && escrita.address === a
                ? dmemWord(applyBytes(estado.dmem, escrita.bytes), a)
                : undefined;
            return (
              <tr key={a} className={a === acessada ? 'mem-acessada' : ''} data-addr={a}>
                <td className="mono">M[{a}]</td>
                {porByte ? (
                  [0, 1, 2, 3].map((k) => (
                    <td key={k} className="mono">
                      {hex(estado.dmem[a + k]!, 2)}
                    </td>
                  ))
                ) : (
                  <td className="mono">
                    {formatar(dmemWord(estado.dmem, a), 32, 'dados', formato)}
                    {novo !== undefined && (
                      <span className="reg-novo"> → {formatar(novo, 32, 'dados', formato)}</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function applyBytes(
  bytes: readonly number[],
  changes: readonly { index: number; after: number }[],
): number[] {
  const out = bytes.slice();
  for (const c of changes) out[c.index] = c.after;
  return out;
}
