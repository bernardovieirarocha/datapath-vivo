export type Tema = 'claro' | 'escuro' | 'sistema';

const CHAVE = 'datapath-vivo:tema';

export function lerTema(): Tema {
  try {
    const v = localStorage.getItem(CHAVE);
    if (v === 'claro' || v === 'escuro' || v === 'sistema') return v;
  } catch {
    // localStorage indisponível (modo privado etc.)
  }
  return 'sistema';
}

export function aplicarTema(t: Tema): void {
  const root = document.documentElement;
  if (t === 'sistema') delete root.dataset['theme'];
  else root.dataset['theme'] = t === 'escuro' ? 'dark' : 'light';
  try {
    localStorage.setItem(CHAVE, t);
  } catch {
    // ignora
  }
}
