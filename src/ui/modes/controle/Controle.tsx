import { useState } from 'react';
import { AbasHash, Cabecalho } from '../../Cabecalho';
import type { Formato } from '../../format';
import { lerInstrucao } from '../explorar/estado';
import { Falhas } from './Falhas';
import { Quiz } from './Quiz';
import { Tabelas } from './Tabelas';

export type SecaoControle = 'quiz' | 'tabelas' | 'falhas';

const ABAS = [
  { href: '#/m3', nome: 'Quiz de sinais' },
  { href: '#/m3/tabelas', nome: 'Tabelas' },
  { href: '#/m3/falhas', nome: 'E se? (falhas)' },
] as const;

/** M3 — Controle: quiz de sinais, tabelas verdade e injeção de falhas. */
export function Controle({ secao, instrucao }: { secao: SecaoControle; instrucao?: string }) {
  const [formato, setFormato] = useState<Formato>('dec');
  const [tabelaInstr, setTabelaInstr] = useState(instrucao ?? 'add $8, $17, $18');
  const lida = lerInstrucao(tabelaInstr);
  const atual = secao === 'quiz' ? '#/m3' : `#/m3/${secao}`;
  return (
    <div className="execucao controle">
      <Cabecalho titulo="Controle" formato={formato} onFormato={setFormato}>
        <AbasHash abas={ABAS} atual={atual} />
      </Cabecalho>
      <main className="pagina-modulo">
        {secao === 'quiz' && <Quiz inicial={instrucao} formato={formato} />}
        {secao === 'tabelas' && (
          <>
            <label className="campo campo-inline">
              <span>Acender a linha de</span>
              <input
                className="mono"
                value={tabelaInstr}
                onChange={(e) => setTabelaInstr(e.target.value)}
                aria-label="Instrução para acender nas tabelas"
              />
            </label>
            <Tabelas mnemonic={lida.ok ? lida.texto.split(' ')[0] : undefined} />
          </>
        )}
        {secao === 'falhas' && <Falhas formato={formato} />}
      </main>
    </div>
  );
}
