/** Textos da tela única (v0.1): ajuda de primeira visita e créditos. Para a monitoria revisar. */
export const VERSAO = 'v0.1';

export const SUBTITULO = 'Veja uma instrução MIPS percorrer o caminho de dados';

export const AJUDA: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Digite uma instrução',
    texto: 'Ou escolha um dos exemplos. Vale Assembly (lw $t0, 8($s1)), hex ou binário.',
  },
  {
    titulo: 'Veja o caminho',
    texto:
      'Os fios usados acendem; os outros ficam cinza. Use as etapas (ou Animar) para ver uma parte de cada vez.',
  },
  {
    titulo: 'Explore os detalhes',
    texto:
      'Mude os valores dos registradores, clique num bloco e abra as abas Sinais e Bits ao lado.',
  },
];

export const CREDITOS =
  'Monitoria de AOC1 — CEFET-MG · baseado nos slides das Aulas 04, 06 e 07 (Patterson & Hennessy, cap. 4)';
