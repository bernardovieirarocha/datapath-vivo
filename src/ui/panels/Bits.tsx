import { bin, hex } from '../../core/bits';
import { FIOS_DO_CAMPO, passosDecodificacao } from '../../content/codificacao';
import { camposDe, type Campo } from '../modes/codificacao/campos';

const CLASSE: Record<Campo['chave'], string> = {
  opcode: 'op',
  rs: 'rs',
  rt: 'rt',
  rd: 'rd',
  shamt: 'shamt',
  funct: 'op',
  imm: 'imm',
};

interface Props {
  word: number;
  /** Fios alimentados pelo campo sob o mouse/foco (para acender no datapath). */
  onFios: (fios: readonly string[]) => void;
}

/** Os 32 bits da instrução por campo e a decodificação passo a passo. */
export function Bits({ word, onFios }: Props) {
  const { formato, campos } = camposDe(word);
  // O último campo é o imediato (tipo I → Instruction[15–0]) ou o endereço (tipo J → [25–0]).
  const fiosDe = (chave: string | undefined): readonly string[] =>
    chave === undefined
      ? []
      : chave === 'imm'
        ? [formato === 'J' ? 'addr26' : 'imm16']
        : (FIOS_DO_CAMPO[chave] ?? []);
  const onCampo = (chave: string | null) => onFios(fiosDe(chave ?? undefined));
  const passos = passosDecodificacao(word);
  return (
    <div className="painel-bits">
      <p className="painel-legenda">
        <span className="mono" data-testid="hex">
          {hex(word)}
        </span>{' '}
        · formato {formato}. Passe o mouse num campo para ver os fios que ele alimenta.
      </p>
      <ul className="bits-campos">
        {campos.map((c) => (
          <li
            key={c.nome}
            className={`bits-campo campo-${CLASSE[c.chave]}`}
            data-campo={c.chave}
            tabIndex={0}
            onMouseEnter={() => onCampo(c.chave)}
            onMouseLeave={() => onCampo(null)}
            onFocus={() => onCampo(c.chave)}
            onBlur={() => onCampo(null)}
          >
            <span className="bits-nome">
              {c.nome}{' '}
              <small>
                [{c.hi}–{c.lo}]
              </small>
            </span>
            <span className="mono bits-bin">{bin(c.valor, c.hi - c.lo + 1)}</span>
            <span className="mono">
              = {c.chave === 'imm' && formato === 'I' ? (c.valor << 16) >> 16 : c.valor}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="painel-titulo">Como decodificar</h3>
      <ol className="cod-passos">
        {passos.map((p, i) => (
          <li
            key={i}
            onMouseEnter={() => onCampo(p.campos[0] ?? null)}
            onMouseLeave={() => onCampo(null)}
          >
            {p.texto}
          </li>
        ))}
      </ol>
    </div>
  );
}
