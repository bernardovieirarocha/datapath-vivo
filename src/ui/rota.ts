/**
 * Rota da v0.1: uma tela só. O hash só carrega a instrução do link:
 * `#/?i=<instrução>` (canônico) ou `#/m1?i=<instrução>` (links antigos).
 * Qualquer outro hash cai na mesma tela.
 */
export function instrucaoDoHash(hash: string): string | undefined {
  const m = /[?&]i=([^&]*)/.exec(hash);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return undefined;
  }
}
