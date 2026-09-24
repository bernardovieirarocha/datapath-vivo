import { useState } from 'react';
import { bin, bits, hex, toSigned } from '../../../core/bits';
import { add32, jumpConcat, shiftLeft2, signExtend } from '../../../core/mono';
import { lerValor } from '../explorar/estado';

function Num({ v, largura = 32 }: { v: number; largura?: number }) {
  return (
    <span className="mono">
      {largura === 32 ? toSigned(v) : v}{' '}
      <span className="muted">({hex(v, Math.ceil(largura / 4))})</span>
    </span>
  );
}

function Entrada({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="campo-valor">
      <span>{rotulo}</span>
      <input
        className={`mono ${lerValor(valor) === undefined ? 'invalida' : ''}`}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-label={rotulo}
      />
    </label>
  );
}

/** Calculadora do endereço de desvio do beq: PC + 4 + ext(imm) << 2. */
export function CalcDesvio({ inicial }: { inicial?: { pc: number; imm: number } }) {
  const [pc, setPc] = useState(String(inicial?.pc ?? 8));
  const [imm, setImm] = useState(String(inicial?.imm ?? -3));
  const p = lerValor(pc);
  const iv = lerValor(imm);
  const ok = p !== undefined && iv !== undefined && toSigned(iv) >= -32768 && toSigned(iv) <= 32767;
  return (
    <section className="calc" aria-label="Calculadora do desvio (beq)">
      <h3>Desvio (beq)</h3>
      <div className="calc-entradas">
        <Entrada rotulo="PC" valor={pc} onChange={setPc} />
        <Entrada rotulo="Imediato" valor={imm} onChange={setImm} />
      </div>
      {ok ? (
        (() => {
          const pc4 = add32(p, 4).sum;
          const ext = signExtend(iv & 0xffff);
          const sh = shiftLeft2(ext);
          const alvo = add32(pc4, sh).sum;
          return (
            <ol className="calc-passos" data-testid="calc-desvio">
              <li>
                PC + 4 = <Num v={pc4} />
              </li>
              <li>
                Extensão de sinal: <span className="mono">{bin(iv, 16)}</span> → <Num v={ext} />
              </li>
              <li>
                Shift left 2 (× 4): <Num v={sh} />
              </li>
              <li>
                Destino = PC + 4 + deslocamento ={' '}
                <strong>
                  <Num v={alvo} />
                </strong>
              </li>
            </ol>
          );
        })()
      ) : (
        <p className="erro-instr">Use números: PC (0x… ou decimal) e imediato de −32768 a 32767.</p>
      )}
    </section>
  );
}

/** Calculadora do endereço do jump: {PC+4[31:28], campo, 00}, com o exemplo do slide. */
export function CalcSalto({ inicial }: { inicial?: { pc: number; campo: number } }) {
  const [pc, setPc] = useState(String(inicial?.pc ?? 8));
  const [campo, setCampo] = useState(String(inicial?.campo ?? 96));
  const p = lerValor(pc);
  const c = lerValor(campo);
  const ok = p !== undefined && c !== undefined && c <= 0x3ffffff;
  return (
    <section className="calc" aria-label="Calculadora do salto (j)">
      <h3>Salto (j)</h3>
      <div className="calc-entradas">
        <Entrada rotulo="PC" valor={pc} onChange={setPc} />
        <Entrada rotulo="Campo (26 bits)" valor={campo} onChange={setCampo} />
        <button
          type="button"
          className="btn"
          onClick={() => {
            setPc('0x0040000C');
            setCampo('1');
          }}
          title="Aula 06, p. 45: PC + 4 = 0x00400010 e campo = 1"
        >
          Exemplo do slide
        </button>
      </div>
      {ok ? (
        (() => {
          const pc4 = add32(p, 4).sum;
          const sh = shiftLeft2(c, 28);
          const alvo = jumpConcat(pc4, sh);
          return (
            <ol className="calc-passos" data-testid="calc-salto">
              <li>
                PC + 4 = <Num v={pc4} /> · 4 bits de cima:{' '}
                <span className="mono">{bin(bits(pc4, 31, 28), 4)}</span>
              </li>
              <li>
                Campo × 4 (shift left 2, 28 bits): <span className="mono">{bin(sh, 28)}</span>
              </li>
              <li>
                Concatenação {'{'}PC+4[31–28], campo, 00{'}'} ={' '}
                <span className="mono">
                  {bin(bits(pc4, 31, 28), 4)} {bin(sh, 28)}
                </span>
              </li>
              <li>
                Destino ={' '}
                <strong>
                  <Num v={alvo} />
                </strong>
              </li>
            </ol>
          );
        })()
      ) : (
        <p className="erro-instr">Use números: PC e campo de 0 a 67108863 (26 bits).</p>
      )}
    </section>
  );
}
