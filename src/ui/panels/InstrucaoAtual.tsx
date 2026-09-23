import { bin } from '../../core/bits';
import { disassemble } from '../../core/isa';
import type { Snapshot } from '../../core/mono';

/** Instrução do ciclo com os campos coloridos como no slide (opcode, rs, rt, rd, shamt, funct). */
export function InstrucaoAtual({ snapshot }: { snapshot: Snapshot }) {
  const word = snapshot.wires['instr']!;
  const d = snapshot.decoded;
  const b = bin(word, 32);
  const formato = d.ok ? d.spec.format : word === 0 ? 'R' : undefined;
  const campos: [string, string, string][] =
    formato === 'R'
      ? [
          ['opcode', b.slice(0, 6), 'op'],
          ['rs', b.slice(6, 11), 'rs'],
          ['rt', b.slice(11, 16), 'rt'],
          ['rd', b.slice(16, 21), 'rd'],
          ['shamt', b.slice(21, 26), 'shamt'],
          ['funct', b.slice(26), 'op'],
        ]
      : formato === 'I'
        ? [
            ['opcode', b.slice(0, 6), 'op'],
            ['rs', b.slice(6, 11), 'rs'],
            ['rt', b.slice(11, 16), 'rt'],
            ['imediato', b.slice(16), 'imm'],
          ]
        : formato === 'J'
          ? [
              ['opcode', b.slice(0, 6), 'op'],
              ['endereço', b.slice(6), 'imm'],
            ]
          : [['?', b, 'shamt']];
  return (
    <div className="instr-atual" aria-live="polite">
      <span className="instr-asm mono">{disassemble(word)}</span>
      <span className="muted mono">{formato ? `tipo ${formato}` : ''}</span>
      <div className="campos" aria-hidden="true">
        {campos.map(([nome, bits, cls]) => (
          <span key={nome} className={`campo-bits campo-${cls}`}>
            <span className="mono">{bits}</span>
            <small>{nome}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
