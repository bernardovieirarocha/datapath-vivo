import { EXEMPLOS } from '../content/exemplos';
import { decodeCompartilhado } from './modes/execucao/link';
import { useExecucao } from './modes/execucao/store';

export type Pagina = 'inicio' | 'm1';

/** Lê o hash (`#/`, `#/m1`, `#/m1?p=…`) e, se vier um programa no link, carrega. */
export function lerRota(hash: string): Pagina {
  const m = /^#\/m1(?:\?p=([A-Za-z0-9_-]+))?/.exec(hash);
  if (!m) return 'inicio';
  const s = useExecucao.getState();
  const c = m[1] ? decodeCompartilhado(m[1]) : undefined;
  if (c) {
    if (c.programa !== s.programa || c.estado !== s.estado || s.linhas.length === 0) {
      s.carregar(c.programa, c.estado);
    }
  } else if (s.linhas.length === 0) {
    const ex = EXEMPLOS[0]!;
    s.carregar(ex.programa, ex.estado);
  }
  return 'm1';
}
