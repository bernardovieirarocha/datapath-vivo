/** Alterna entre as duas telas do M1: uma instrução × um programa inteiro. */
export function ModoTabs({ atual }: { atual: 'instrucao' | 'programa' }) {
  return (
    <nav className="modo-tabs" aria-label="Modo">
      <a href="#/m1" aria-current={atual === 'instrucao' ? 'page' : undefined}>
        Uma instrução
      </a>
      <a href="#/m1/programa" aria-current={atual === 'programa' ? 'page' : undefined}>
        Programa passo a passo
      </a>
    </nav>
  );
}
