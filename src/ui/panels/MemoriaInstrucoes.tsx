import { hex } from '../../core/bits';
import { disassemble, type AsmLine } from '../../core/isa';
import type { MonoState } from '../../core/mono';

interface Props {
  estado: MonoState;
  linhas: readonly AsmLine[];
  breakpoints: readonly number[];
  onBreakpoint: (pc: number) => void;
}

export function MemoriaInstrucoes({ estado, linhas, breakpoints, onBreakpoint }: Props) {
  const fonte = new Map(linhas.map((l) => [l.address, l.source]));
  const n = Math.max(linhas.length, estado.pc / 4 + 1, 1);
  const enderecos = Array.from({ length: Math.min(n + 1, estado.imem.length) }, (_, i) => i * 4);
  return (
    <div className="painel-imem">
      <p className="painel-legenda">Clique no ● para marcar um breakpoint (o Rodar para ali).</p>
      <table className="mem imem">
        <tbody>
          {enderecos.map((a) => {
            const word = estado.imem[a / 4] ?? 0;
            const bp = breakpoints.includes(a);
            return (
              <tr key={a} className={a === estado.pc ? 'imem-atual' : ''} data-addr={a}>
                <td>
                  <button
                    type="button"
                    className={`bp ${bp ? 'bp-on' : ''}`}
                    aria-label={`${bp ? 'Remover' : 'Marcar'} breakpoint no endereço ${a}`}
                    aria-pressed={bp}
                    onClick={() => onBreakpoint(a)}
                  >
                    ●
                  </button>
                </td>
                <td className="mono">{a}</td>
                <td className="mono muted">{hex(word)}</td>
                <td className="mono">{fonte.get(a) ?? disassemble(word)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
