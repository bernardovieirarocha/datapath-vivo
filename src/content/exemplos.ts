/**
 * Programas prontos do modo Execução. `estado` usa o formato do editor de estado
 * inicial: uma atribuição por linha, `$8 = 5` ou `M[8] = 7` (palavra de 32 bits).
 */
export interface Exemplo {
  id: string;
  titulo: string;
  origem: string;
  programa: string;
  estado: string;
}

export const EXEMPLOS: readonly Exemplo[] = [
  {
    id: 'padrao',
    titulo: 'Programa de exemplo (laço com beq, lw, sw e j)',
    origem: 'Programa do golden trace (docs/PLANO.md, Seção 2.8)',
    programa: `# Se $8 == $9, pula o addi. Depois guarda $8 na memória,
# lê de volta em $16, subtrai 1 e recomeça.
inicio: beq  $8, $9, pula
        addi $8, $8, 2
pula:   sw   $8, 0($12)      # M[4] <- $8
        lw   $16, 0($12)     # $16 <- M[4]
        sub  $8, $16, $10    # $8 <- $16 - 1
        j    inicio
`,
    estado: `$8 = 5
$9 = 5
$10 = 1
$12 = 4
M[0] = 5
M[8] = 7
`,
  },
  {
    id: 'quiz-add',
    titulo: 'add $8, $17, $18 (exemplo do quiz de sinais)',
    origem: 'Aula 06, p. 36–39',
    programa: `add $8, $17, $18
`,
    estado: `$17 = 12
$18 = 30
`,
  },
  {
    id: 'troca',
    titulo: 'Troca de duas palavras na memória',
    origem: 'Material extra da Aula 06 (lw/sw)',
    programa: `lw $t0, 0($2)
lw $t1, 4($2)
sw $t1, 0($2)
sw $t0, 4($2)
`,
    estado: `$2 = 16
M[16] = 111
M[20] = 222
`,
  },
  {
    id: 'slt',
    titulo: 'slt com sinais opostos',
    origem: 'Aula 06 (controle da ULA)',
    programa: `slt $3, $1, $2    # -5 < 7 ?
slt $4, $2, $1    #  7 < -5 ?
`,
    estado: `$1 = -5
$2 = 7
`,
  },
];
