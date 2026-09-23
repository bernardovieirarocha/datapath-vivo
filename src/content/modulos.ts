/** Módulos da ferramenta (docs/PLANO.md, Seção 5). `fase` = em qual fase do roadmap ele fica pronto. */
export interface Modulo {
  id: `M${number}`;
  titulo: string;
  resumo: string;
  fase: number;
}

export const MODULOS: readonly Modulo[] = [
  {
    id: 'M1',
    titulo: 'Execução passo a passo',
    resumo: 'O datapath da Prática 10 rodando, ciclo a ciclo.',
    fase: 3,
  },
  {
    id: 'M2',
    titulo: 'Construção',
    resumo: 'Monte o datapath como na aula: busca, tipo R, lw/sw, beq, j.',
    fase: 8,
  },
  {
    id: 'M3',
    titulo: 'Controle e Quiz de sinais',
    resumo: 'RegDst, ALUSrc, MemtoReg… e o que acontece se errar.',
    fase: 4,
  },
  { id: 'M4', titulo: 'Codificação', resumo: 'Instrução ↔ 32 bits, campo a campo.', fase: 4 },
  {
    id: 'M5',
    titulo: 'Timing e caminho crítico',
    resumo: 'Período mínimo do monociclo, como na Aula 07.',
    fase: 6,
  },
  { id: 'M6', titulo: 'Multiciclo', resumo: 'IR, MDR, A, B, ALUOut e a FSM de controle.', fase: 7 },
  {
    id: 'M7',
    titulo: 'Placa DE10-Lite',
    resumo: 'LEDs e displays como na placa do laboratório.',
    fase: 5,
  },
  {
    id: 'M8',
    titulo: 'Laboratório de Extensão',
    resumo: 'Acrescente bne, slti, jal, jr ao hardware.',
    fase: 8,
  },
  {
    id: 'M9',
    titulo: 'Exercícios',
    resumo: 'Questões corrigidas pelo próprio simulador.',
    fase: 9,
  },
];
