/** Por que cada don't care do slide é "tanto faz" (Aula 06, p. 34; linha do j pelo P&H). */
export function motivoX(sinal: string, mnemonic: string): string {
  if (sinal === 'RegDst' || sinal === 'MemtoReg') {
    return `X: no ${mnemonic} RegWrite = 0, nada é escrito no banco — tanto faz qual ${
      sinal === 'RegDst' ? 'registrador seria o destino' : 'dado seria escrito'
    }.`;
  }
  if (sinal === 'ALUSrc') {
    return 'X: no j o resultado da ULA não vai para lugar nenhum (nem banco, nem memória, nem desvio).';
  }
  return 'X: esse sinal não influencia o resultado desta instrução.';
}

export const QUIZ = {
  titulo: 'Qual é o caminho de dados da instrução?',
  origem: 'Aula 06, p. 36–39',
  instrucoes:
    'Escolha o valor de cada sinal de controle. Use X quando o valor não importa (don’t care), como na tabela do slide.',
  semEfeito:
    'Nesta instrução, esse valor errado por acaso não muda o resultado — mas não é o que a tabela diz.',
  xErrado: 'Não é don’t care: aqui o valor importa. Com o outro valor, ',
};
