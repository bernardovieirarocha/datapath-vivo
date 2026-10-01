/** Textos da tela única: ajuda de primeira visita e créditos. Para a monitoria revisar. */
export const VERSAO = 'v0.2';

export const SUBTITULO = 'Simulação do caminho de dados MIPS monociclo';

export const AJUDA: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Informe uma instrução',
    texto:
      'Digite a instrução no campo "Instrução" ou selecione uma das instruções suportadas. A instrução pode ser informada em assembly, hexadecimal ou binário.',
  },
  {
    titulo: 'Acompanhe o caminho de dados',
    texto:
      'As unidades funcionais e os fios por onde a instrução se propaga ficam destacados em cores; os demais permanecem em cinza. Use os botões das etapas, ou "Animar", para acompanhar a execução etapa por etapa.',
  },
  {
    titulo: 'Altere os valores',
    texto:
      'Em "Registradores e memória", logo acima do datapath, altere o valor do PC e dos registradores usados pela instrução (e, no lw, da posição de memória lida). O datapath e os resultados são atualizados imediatamente.',
  },
  {
    titulo: 'Consulte os detalhes',
    texto:
      'Clique em uma unidade funcional do datapath (por exemplo, a ULA ou o Banco de Registradores) para ver sua descrição. No painel à direita, a aba Instrução mostra a codificação em binário, a aba Controle mostra os sinais de controle e a aba Execução descreve cada etapa.',
  },
];

export const CREDITOS =
  'Monitoria de AOC1 — CEFET-MG · baseado nos slides das Aulas 04, 06 e 07 (Patterson & Hennessy, cap. 4)';
