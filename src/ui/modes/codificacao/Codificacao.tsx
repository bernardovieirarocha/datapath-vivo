import { useMemo, useState } from 'react';
import { bin, bits, hex, toSigned } from '../../../core/bits';
import { computeActivity, exploreState, step } from '../../../core/mono';
import { FIOS_DO_CAMPO, passosDecodificacao } from '../../../content/codificacao';
import { Cabecalho } from '../../Cabecalho';
import { Datapath } from '../../datapath/Datapath';
import type { Formato } from '../../format';
import { lerInstrucao } from '../explorar/estado';
import { CalcDesvio, CalcSalto } from './Calculadoras';
import { camposDe, type Campo } from './campos';

const CLASSE: Record<Campo['chave'], string> = {
  opcode: 'op',
  rs: 'rs',
  rt: 'rt',
  rd: 'rd',
  shamt: 'shamt',
  funct: 'op',
  imm: 'imm',
};

const EXEMPLOS = [
  'add $8, $17, $18',
  'lw $t0, 32($s3)',
  'beq $8, $9, -3',
  'j 96',
  '0x8E280008',
  '0x020A4022',
];

/** M4 — Codificação: instrução ↔ 32 bits, decodificação passo a passo e calculadoras. */
export function Codificacao({ inicial }: { inicial?: string }) {
  const [formatoNum, setFormatoNum] = useState<Formato>('dec');
  const [texto, setTexto] = useState(inicial ?? 'lw $t0, 32($s3)');
  const [ultima, setUltima] = useState(() => {
    const r = lerInstrucao(inicial ?? 'lw $t0, 32($s3)');
    return r.ok ? r : { ok: true as const, word: 0x8e680020, texto: 'lw $8, 32($19)' };
  });
  const [campoFoco, setCampoFoco] = useState<Campo['chave'] | null>(null);
  const lido = lerInstrucao(texto);
  const word = lido.ok ? lido.word : ultima.word;
  const mudar = (t: string) => {
    setTexto(t);
    const r = lerInstrucao(t);
    if (r.ok) setUltima(r);
  };

  const { formato, campos } = camposDe(word);
  const passos = passosDecodificacao(word);
  const snap = useMemo(() => step(exploreState(word)).snapshot, [word]);
  const activity = useMemo(() => computeActivity(snap), [snap]);
  const destaque = new Set(campoFoco ? FIOS_DO_CAMPO[campoFoco] : []);
  const b = bin(word, 32);
  const mn = snap.decoded.ok ? snap.decoded.instr.mnemonic : undefined;
  const imm = toSigned((bits(word, 15, 0) << 16) >> 16);

  return (
    <div className="execucao codificacao">
      <Cabecalho titulo="Codificação" formato={formatoNum} onFormato={setFormatoNum} />
      <main className="pagina-modulo">
        <div className="entrada-instr">
          <label htmlFor="instr-cod">Instrução (Assembly, hex ou binário)</label>
          <input
            id="instr-cod"
            className={`mono ${lido.ok ? '' : 'invalida'}`}
            value={texto}
            onChange={(e) => mudar(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!lido.ok}
          />
          {!lido.ok && (
            <p className="erro-instr" role="alert">
              {lido.erro} Mostrando: {ultima.texto}.
            </p>
          )}
          <div className="atalhos-instr" role="group" aria-label="Exemplos">
            {EXEMPLOS.map((e) => (
              <button key={e} type="button" className="chip-btn mono" onClick={() => mudar(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <section className="cod-bits" aria-label="Os 32 bits">
          <p className="cod-resumo">
            <span className="mono instr-asm">
              {snap.decoded.ok ? passos.at(-1)!.texto.replace('Resultado: ', '') : '—'}
            </span>
            <span className="muted"> · tipo {formato} · </span>
            <span className="mono" data-testid="hex">
              {hex(word)}
            </span>
          </p>
          <div className="cod-campos" role="list">
            {campos.map((c) => (
              <div
                key={c.nome}
                role="listitem"
                className={`cod-campo campo-${CLASSE[c.chave]} ${campoFoco === c.chave ? 'cod-foco' : ''}`}
                style={{ flexGrow: c.hi - c.lo + 1 }}
                onMouseEnter={() => setCampoFoco(c.chave)}
                onMouseLeave={() => setCampoFoco(null)}
                onFocus={() => setCampoFoco(c.chave)}
                onBlur={() => setCampoFoco(null)}
                tabIndex={0}
                data-campo={c.chave}
                aria-label={`${c.nome}, bits ${c.hi} a ${c.lo}: ${c.valor}`}
              >
                <span className="cod-nome">{c.nome}</span>
                <span className="cod-bin mono">{bin(c.valor, c.hi - c.lo + 1)}</span>
                <span className="cod-idx mono">
                  <span>{c.hi}</span>
                  <span>{c.lo}</span>
                </span>
                <span className="cod-dec mono">
                  = {c.chave === 'imm' && formato === 'I' ? imm : c.valor}
                </span>
              </div>
            ))}
          </div>
          <div className="cod-nibbles" aria-label="Binário para hexadecimal, de 4 em 4 bits">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="nibble">
                <span className="mono">{b.slice(i * 4, i * 4 + 4)}</span>
                <span className="mono nib-hex">
                  {hex(bits(word, 31 - i * 4, 28 - i * 4), 1).slice(2)}
                </span>
              </span>
            ))}
          </div>
          <p className="muted dica">
            Passe o mouse num campo para ver os fios que ele alimenta no datapath.
          </p>
        </section>

        <div className="cod-grid">
          <section aria-label="Decodificação passo a passo">
            <h2 className="painel-titulo">Decodificação passo a passo</h2>
            <ol className="cod-passos">
              {passos.map((p, i) => (
                <li
                  key={i}
                  onMouseEnter={() => setCampoFoco((p.campos[0] as Campo['chave']) ?? null)}
                  onMouseLeave={() => setCampoFoco(null)}
                >
                  {p.texto}
                </li>
              ))}
            </ol>
          </section>
          <div className="calcs">
            <CalcDesvio
              key={`b${mn === 'beq' ? word : 'x'}`}
              inicial={mn === 'beq' ? { pc: 8, imm } : undefined}
            />
            <CalcSalto
              key={`j${mn === 'j' ? word : 'x'}`}
              inicial={mn === 'j' ? { pc: 8, campo: bits(word, 25, 0) } : undefined}
            />
          </div>
        </div>

        <div className="rolavel">
          <Datapath
            wires={snap.wires}
            activity={activity}
            fase={5}
            formato={formatoNum}
            selecionado={null}
            onSelect={() => {}}
            destaque={destaque}
          />
        </div>
      </main>
    </div>
  );
}
