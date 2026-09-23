/** Nomes convencionais dos registradores MIPS, indexados pelo número. */
// prettier-ignore
export const REGISTER_NAMES: readonly string[] = [
  'zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3',
  't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
  's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
  't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra',
];

const BY_NAME = new Map(REGISTER_NAMES.map((n, i) => [n, i]));

/**
 * Lê um registrador escrito como `$8`, `$t0` ou `$zero`. Devolve o número (0..31)
 * ou `undefined` se não for um registrador válido.
 */
export function parseRegister(text: string): number | undefined {
  const m = /^\$([a-z0-9]+)$/i.exec(text.trim());
  if (!m) return undefined;
  const body = m[1]!.toLowerCase();
  if (/^\d+$/.test(body)) {
    const n = Number(body);
    return n <= 31 && String(n) === body ? n : undefined;
  }
  return BY_NAME.get(body);
}

export type RegisterStyle = 'numero' | 'nome';

/** Formata o registrador: `$8` (estilo do lab, padrão) ou `$t0`. */
export function formatRegister(n: number, style: RegisterStyle = 'numero'): string {
  return style === 'nome' ? `$${REGISTER_NAMES[n]}` : `$${n}`;
}
