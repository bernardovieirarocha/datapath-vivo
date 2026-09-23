import { hex } from '../core/bits';
import type { AlertCode } from '../core/mono';

/** Sinais do controle principal (Aula 06, p. 31–32), na ordem da tabela do slide. */
export const SINAIS: Readonly<Record<string, string>> = {
  RegDst:
    'Inativo: o registrador de destino é Instruction[20–16] (rt). Ativo: é Instruction[15–11] (rd).',
  Branch:
    'Sinaliza que a instrução é de desvio. Junto com o Zero da ULA decide se o PC recebe o endereço de destino.',
  MemRead: 'Ativo: o conteúdo do endereço da memória de dados é colocado na saída.',
  MemtoReg: 'Inativo: o valor escrito no banco vem da ULA. Ativo: vem da memória de dados.',
  ALUOp:
    'Dois bits usados para definir a entrada de controle da ULA (00 soma, 01 subtração, 10 funct).',
  MemWrite: 'Ativo: o dado de Write data é gravado no endereço da memória de dados.',
  ALUSrc:
    'Inativo: a 2ª entrada da ULA vem do banco de registradores. Ativo: vem da instrução, após a extensão de sinal.',
  RegWrite: 'Ativo: permite a escrita no banco de registradores.',
  Jump: 'Ativo: o próximo PC é o endereço do jump (Aula 06, p. 48).',
};

/** Fases visuais do ciclo (a semântica continua monociclo: tudo acontece num ciclo só). */
export const FASES: readonly { nome: string; descricao: string }[] = [
  { nome: 'Busca', descricao: 'O PC vai para a memória de instruções; o somador calcula PC + 4.' },
  {
    nome: 'Decodificação',
    descricao: 'O controle lê o opcode e o banco lê rs e rt; o imediato é estendido.',
  },
  { nome: 'Execução', descricao: 'A ULA calcula; o somador do desvio calcula o destino.' },
  { nome: 'Memória', descricao: 'lw lê e sw prepara a escrita na memória de dados.' },
  {
    nome: 'Escrita',
    descricao:
      'O valor chega ao banco; na borda do clock o PC, o banco e a memória são atualizados.',
  },
];

/** Texto de cada alerta do simulador. */
export function textoAlerta(code: AlertCode, value: number): string {
  switch (code) {
    case 'opcode-desconhecido':
      return `Opcode ${value.toString(2).padStart(6, '0')} desconhecido: o controle zerou todos os sinais e a instrução não faz nada (só PC + 4).`;
    case 'funct-desconhecido':
      return value === 0
        ? 'Instrução 0x00000000 (nop): o funct 000000 não está na tabela do controle da ULA, que gera 000 (AND); o resultado vai para $0, então nada muda.'
        : `Funct ${value.toString(2).padStart(6, '0')} desconhecido: o controle da ULA gera 000 (AND).`;
    case 'dmem-fora-da-memoria':
      return `Endereço ${hex(value)} fora da memória de dados do simulador (0 a 255): a leitura dá 0 e a escrita é ignorada.`;
    case 'dmem-desalinhado':
      return `Endereço ${hex(value)} não é múltiplo de 4. No MIPS real isso gera exceção; aqui os 2 bits de baixo são ignorados.`;
    case 'pc-fora-da-imem':
      return `PC = ${hex(value)} passou do fim da memória de instruções: a instrução lida é 0x00000000.`;
  }
}
