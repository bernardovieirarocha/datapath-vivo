import { bin } from '../../../core/bits';
import { control, DONT_CARES } from '../../../core/mono';
import { COLUNAS } from './correcao';

const LINHAS: readonly { nome: string; opcode: number; mn: readonly string[] }[] = [
  { nome: 'Tipo R', opcode: 0b000000, mn: ['add', 'sub', 'and', 'or', 'slt'] },
  { nome: 'addi', opcode: 0b001000, mn: ['addi'] },
  { nome: 'lw', opcode: 0b100011, mn: ['lw'] },
  { nome: 'sw', opcode: 0b101011, mn: ['sw'] },
  { nome: 'beq', opcode: 0b000100, mn: ['beq'] },
  { nome: 'j', opcode: 0b000010, mn: ['j'] },
];

const ULA: readonly {
  aluOp: string;
  funct: string;
  op: string;
  ctl: string;
  mn: readonly string[];
}[] = [
  { aluOp: '00', funct: 'XXXXXX', op: 'soma (lw, sw, addi)', ctl: '010', mn: ['lw', 'sw', 'addi'] },
  { aluOp: '01', funct: 'XXXXXX', op: 'subtração (beq)', ctl: '110', mn: ['beq'] },
  { aluOp: '10', funct: '100000', op: 'add', ctl: '010', mn: ['add'] },
  { aluOp: '10', funct: '100010', op: 'sub', ctl: '110', mn: ['sub'] },
  { aluOp: '10', funct: '100100', op: 'and', ctl: '000', mn: ['and'] },
  { aluOp: '10', funct: '100101', op: 'or', ctl: '001', mn: ['or'] },
  { aluOp: '10', funct: '101010', op: 'slt', ctl: '111', mn: ['slt'] },
];

/** Tabelas do controle principal e do controle da ULA, com a linha da instrução acesa. */
export function Tabelas({ mnemonic }: { mnemonic?: string }) {
  return (
    <div className="tabelas">
      <h2>Controle principal</h2>
      <p className="muted">Aula 06, p. 34 (R, lw, sw, beq) + addi e j. X = don’t care.</p>
      <div className="tabela-rolavel">
        <table className="tabela-controle">
          <thead>
            <tr>
              <th>Instrução</th>
              <th>opcode</th>
              {COLUNAS.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => {
              const c = control(l.opcode);
              const xs = DONT_CARES[l.opcode] ?? [];
              const acesa = mnemonic !== undefined && l.mn.includes(mnemonic);
              return (
                <tr
                  key={l.nome}
                  className={acesa ? 'linha-acesa' : ''}
                  aria-current={acesa ? 'true' : undefined}
                >
                  <th scope="row">{l.nome}</th>
                  <td className="mono">{bin(l.opcode, 6)}</td>
                  {COLUNAS.map((s) => (
                    <td key={s} className="mono">
                      {xs.includes(s) ? 'X' : s === 'ALUOp' ? bin(c[s], 2) : c[s]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted nota">
        Na tabela do slide os sinais aparecem também com os nomes da edição em português do livro:
        MemparaReg (MemtoReg), EscreveReg (RegWrite), LeMem (MemRead), EscreveMem (MemWrite), OpALU
        (ALUOp).
      </p>

      <h2>Controle da ULA</h2>
      <p className="muted">
        Aula 06, p. 27–30. 3 bits (no livro são 4: o bit extra é o Ainvert do NOR).
      </p>
      <div className="tabela-rolavel">
        <table className="tabela-controle">
          <thead>
            <tr>
              <th>ALUOp</th>
              <th>funct</th>
              <th>Operação</th>
              <th>Controle da ULA</th>
            </tr>
          </thead>
          <tbody>
            {ULA.map((l) => {
              const acesa = mnemonic !== undefined && l.mn.includes(mnemonic);
              return (
                <tr
                  key={l.op}
                  className={acesa ? 'linha-acesa' : ''}
                  aria-current={acesa ? 'true' : undefined}
                >
                  <td className="mono">{l.aluOp}</td>
                  <td className="mono">{l.funct}</td>
                  <td>{l.op}</td>
                  <td className="mono">{l.ctl}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
