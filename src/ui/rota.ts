import { EXEMPLOS } from '../content/exemplos';
import { decodeCompartilhado } from './modes/execucao/link';
import { useExecucao } from './modes/execucao/store';

export type Rota =
  | { pagina: 'inicio' }
  | { pagina: 'instrucao'; instrucao?: string }
  | { pagina: 'programa' }
  | { pagina: 'controle'; secao: 'quiz' | 'tabelas' | 'falhas'; instrucao?: string }
  | { pagina: 'codificacao'; instrucao?: string };

function paramI(q: string | undefined): string | undefined {
  if (!q) return undefined;
  try {
    return decodeURIComponent(q);
  } catch {
    return undefined;
  }
}

/**
 * Lê o hash:
 * - `#/m1` ou `#/m1?i=<instrução>` → Explorar instrução;
 * - `#/m1/programa` ou `#/m1?p=<programa>` (links antigos) → Programa passo a passo.
 * Se vier um programa no link, já carrega no store.
 */
export function lerRota(hash: string): Rota {
  const prog = /^#\/m1(?:\/programa)?\?p=([A-Za-z0-9_-]+)/.exec(hash);
  if (prog || /^#\/m1\/programa/.test(hash)) {
    const s = useExecucao.getState();
    const c = prog ? decodeCompartilhado(prog[1]!) : undefined;
    if (c) {
      if (c.programa !== s.programa || c.estado !== s.estado || s.linhas.length === 0) {
        s.carregar(c.programa, c.estado);
      }
    } else if (s.linhas.length === 0) {
      const ex = EXEMPLOS[0]!;
      s.carregar(ex.programa, ex.estado);
    }
    return { pagina: 'programa' };
  }
  const m = /^#\/m1(?:\?i=([^&]*))?$/.exec(hash);
  if (m) {
    return { pagina: 'instrucao', instrucao: paramI(m[1]) };
  }
  const m3 = /^#\/m3(?:\/(tabelas|falhas))?(?:\?i=([^&]*))?$/.exec(hash);
  if (m3) {
    return {
      pagina: 'controle',
      secao: (m3[1] as 'tabelas' | 'falhas' | undefined) ?? 'quiz',
      instrucao: paramI(m3[2]),
    };
  }
  const m4 = /^#\/m4(?:\?i=([^&]*))?$/.exec(hash);
  if (m4) return { pagina: 'codificacao', instrucao: paramI(m4[1]) };
  return { pagina: 'inicio' };
}
