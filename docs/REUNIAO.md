# Conversa com a professora — v0.1

Site: https://bernardovieirarocha.github.io/datapath-vivo/

## O que mostrar em 5 minutos

1. **A tela abre num `lw`.** Mostrar o caminho aceso e o que fica cinza; a aba "O que acontece" com os valores reais ("68 + 8 = 76").
2. **Trocar para `add` e para `beq`** pelos exemplos: o caminho muda na hora.
3. **No `beq`, igualar `$17` e `$18`**: o desvio passa a ser tomado e o próximo PC muda.
4. **Animar**: as 5 etapas, uma de cada vez (é a parte pensada para o projetor).
5. **Clicar na ULA ou no Banco de Registradores**: a explicação e a página do slide.
6. **Abas Sinais e Bits**: a tabela de controle com os X do slide, e a decodificação passo a passo.

## O que perguntar

Geral:
- Isso ajuda na Aula 06? Ela usaria no projetor, ou é mais para o aluno estudar sozinho?
- O desenho e os nomes batem com o que ela usa em sala?
- O que falta para ela indicar aos alunos?

Pontos do conteúdo que dependem dela (`docs/DUVIDAS.md`):
- **Linha do `j` na tabela de controle.** O slide não mostra; usei X em RegDst, ALUSrc e MemtoReg.
- **addi.** Não está no subconjunto do slide, mas a ferramenta trata como as outras. Ela cobra na prova?
- **Endereço inicial.** A ferramenta começa o PC em 0; alguns exemplos dos slides usam 0x00400000.
- **Valores iniciais.** Os registradores começam com `$n = 4 × n` (ex.: `$17 = 68`), para os números nos fios serem fáceis de seguir. Ela prefere outra convenção?

## O que já existe e pode entrar depois

Fora do ar na v0.1, mas pronto no código. A ordem depende do que ela achar mais útil:
- **Quiz de sinais** (réplica do slide "Qual é o caminho de dados da instrução?"), que mostra a consequência de cada sinal errado.
- **"E se?"**: o que acontece se um sinal de controle travar em 0 ou 1.
- **Programa passo a passo**: vários ciclos, com registradores e memória.
- **Codificação**: calculadoras de desvio e de salto com o exemplo do slide.

Ainda não feito: caminho crítico e período do clock (Aula 07), multiciclo, exercícios.

## Retorno da professora (v0.1 → v0.2)

Avaliação geral: "a ferramenta está muito didática e vai ajudar demais na disciplina"; ela vai usar nas aulas. Pediu melhorias de usabilidade (cores, texto, explicações) e textos mais formais. Pontos e o que foi feito na v0.2:

1. "Exemplos" → **"Instruções suportadas"**.
2. Ajuda sem o exemplo do lw: "a instrução pode ser informada em assembly, hexadecimal ou binário".
3. Ajuda: "as unidades funcionais e os fios por onde a instrução se propaga ficam destacados em cores; os demais permanecem em cinza".
4. Ajuda do item 3 estava confusa (onde mudar os valores? clicar em quê?): virou dois passos, que dizem onde fica "Registradores e memória" e que se clica numa unidade funcional (ex.: ULA, Banco de Registradores), e o que cada aba mostra.
5. Abas renomeadas e reordenadas: **Instrução** (tradução da instrução) → **Controle** (sinais) → **Execução** (passo a passo). A primeira abre por padrão.
6. Descrições das etapas reescritas no formato "a unidade recebe na entrada… e apresenta na saída…". Ex.: "A Memória de Instruções recebe na entrada o endereço armazenado no PC (0) e apresenta na saída a instrução armazenada nesse endereço". Ela espera ajustar mais depois de ver com os alunos.
7. Cores: os campos da instrução (etapa de decodificação) estavam num cinza escuro que se confundia com os elementos não usados → **laranja**. O verde-azulado dos endereços (etapa de busca) ficava próximo do azul dos dados para quem tem dificuldade visual → **verde-bandeira** (#009c3b).
8. "Valores (mude à vontade)" → **"Registradores e memória"**.
9. Textos mais formais em toda a tela (ajuda, legendas, explicação das etapas, unidades funcionais, alertas, decodificação).
