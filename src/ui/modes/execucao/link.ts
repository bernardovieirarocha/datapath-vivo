/** Programa + estado inicial codificados no hash da URL (a professora manda o link). */
export interface Compartilhado {
  programa: string;
  estado: string;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeCompartilhado(c: Compartilhado): string {
  return toBase64Url(JSON.stringify({ p: c.programa, e: c.estado }));
}

/** Devolve `undefined` se o texto não for um link válido (nunca lança). */
export function decodeCompartilhado(data: string): Compartilhado | undefined {
  try {
    const obj: unknown = JSON.parse(fromBase64Url(data));
    if (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as Record<string, unknown>)['p'] === 'string' &&
      typeof (obj as Record<string, unknown>)['e'] === 'string'
    ) {
      const o = obj as { p: string; e: string };
      return { programa: o.p, estado: o.e };
    }
  } catch {
    // link corrompido: ignora
  }
  return undefined;
}
