const CHAVE = 'datapath-vivo:ajuda-vista';

export function ajudaJaVista(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function marcarAjudaVista(): void {
  try {
    localStorage.setItem(CHAVE, '1');
  } catch {
    // localStorage indisponível: a ajuda só reaparece na próxima visita
  }
}
