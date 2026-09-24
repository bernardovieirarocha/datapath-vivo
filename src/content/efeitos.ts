import { hex, toSigned } from '../core/bits';
import type { Difference } from '../core/faults';

/**
 * Descreve em português o que muda quando um sinal está errado (quiz) ou travado
 * (injeção de falhas), a partir das diferenças calculadas por `core/faults`.
 */
export function descreverDiferencas(diffs: readonly Difference[]): string[] {
  return diffs.map((d) => {
    switch (d.kind) {
      case 'reg': {
        const e = d.expected;
        const a = d.actual;
        if (e && a && e.index !== a.index) {
          return `escreveria em $${a.index} em vez de $${e.index} (valor ${toSigned(a.value)}).`;
        }
        if (e && a)
          return `$${e.index} receberia ${toSigned(a.value)} em vez de ${toSigned(e.value)}.`;
        if (e)
          return `não escreveria no banco: $${e.index} deveria receber ${toSigned(e.value)} e ficaria com o valor antigo.`;
        return `escreveria $${a!.index} ← ${toSigned(a!.value)}, mas esta instrução não deveria escrever no banco.`;
      }
      case 'mem': {
        const e = d.expected;
        const a = d.actual;
        if (e && a && e.address !== a.address) {
          return `gravaria em M[${a.address}] em vez de M[${e.address}].`;
        }
        if (e && a)
          return `M[${e.address}] receberia ${toSigned(a.value)} em vez de ${toSigned(e.value)}.`;
        if (e)
          return `não gravaria na memória: M[${e.address}] deveria receber ${toSigned(e.value)}.`;
        return `gravaria M[${a!.address}] ← ${toSigned(a!.value)}, mas esta instrução não deveria mexer na memória.`;
      }
      case 'pc':
        return `o próximo PC seria ${d.actual} (${hex(d.actual)}) em vez de ${d.expected}.`;
    }
  });
}

/** O que a instrução faz na borda (ex.: "$8 ← 42 · PC ← 4"). */
export function descreverResultado(o: {
  reg?: { index: number; value: number };
  mem?: { address: number; value: number };
  pc: number;
}): string {
  const partes: string[] = [];
  if (o.reg) partes.push(`$${o.reg.index} ← ${toSigned(o.reg.value)}`);
  if (o.mem) partes.push(`M[${o.mem.address}] ← ${toSigned(o.mem.value)}`);
  partes.push(`PC ← ${o.pc}`);
  return partes.join(' · ');
}
