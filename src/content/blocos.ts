/**
 * Explicação de cada bloco do datapath (painel que abre ao clicar no bloco).
 * Ids = ids da netlist (`src/core/mono/datapath.ts`). Texto para a monitoria revisar.
 * `slide` = onde o bloco aparece nas aulas (PDFs em docs/ref/).
 */
export interface TextoBloco {
  /** Nome como no slide/aula. */
  titulo: string;
  /** Nome do bloco na figura do slide (em inglês, como na figura do P&H). */
  naFigura?: string;
  tipo: 'combinacional' | 'sequencial' | 'controle';
  descricao: string;
  slide: string;
}

export const BLOCOS: Readonly<Record<string, TextoBloco>> = {
  pc: {
    titulo: 'PC (contador de programa)',
    naFigura: 'PC',
    tipo: 'sequencial',
    descricao:
      'Registrador de 32 bits com o endereço da instrução atual. É escrito em todo ciclo, na borda de subida do clock, com o próximo PC escolhido pelos muxes de desvio e de salto.',
    slide: 'Aula 06, p. 13–14 (busca da instrução)',
  },
  const4: {
    titulo: 'Constante 4',
    tipo: 'combinacional',
    descricao:
      'Cada instrução MIPS ocupa 4 bytes. Somar 4 ao PC resulta no endereço da instrução seguinte na memória.',
    slide: 'Aula 06 (busca da instrução)',
  },
  pcAdder: {
    titulo: 'Somador PC + 4',
    naFigura: 'Add',
    tipo: 'combinacional',
    descricao:
      'Calcula PC + 4, o endereço da próxima instrução em sequência. Trabalha em paralelo com a memória de instruções.',
    slide: 'Aula 06 (busca da instrução)',
  },
  imem: {
    titulo: 'Memória de Instruções',
    naFigura: 'Instruction memory',
    tipo: 'sequencial',
    descricao:
      'Dado um endereço, coloca na saída a instrução nele armazenada. No monociclo ela é separada da memória de dados (arquitetura Harvard), porque no mesmo ciclo é preciso buscar a instrução e, no lw/sw, acessar um dado.',
    slide: 'Aula 06, p. 16; Aula 04 (Harvard × von Neumann)',
  },
  fields: {
    titulo: 'Campos da instrução',
    naFigura: 'Instruction [31–0]',
    tipo: 'combinacional',
    descricao:
      'Os 32 bits da instrução são divididos em campos, cada um conduzido por um conjunto de fios: [31–26] (opcode) para a Unidade de Controle; [25–21] (rs) e [20–16] (rt) para as leituras do Banco de Registradores; [15–11] (rd) como possível destino; [15–0] (imediato); [5–0] (funct); [25–0] (endereço do jump). Não há processamento nesta etapa, apenas a distribuição dos bits.',
    slide: 'Aula 06, p. 12 (formatos R, I e J)',
  },
  control: {
    titulo: 'Controle',
    naFigura: 'Control',
    tipo: 'controle',
    descricao:
      'A partir do opcode (Instruction [31–26]), gera os sinais que configuram o datapath para a instrução: RegDst, Jump, Branch, MemRead, MemtoReg, ALUOp, MemWrite, ALUSrc e RegWrite.',
    slide: 'Aula 06, p. 31–35',
  },
  muxRegDst: {
    titulo: 'Mux RegDst',
    naFigura: 'Mux',
    tipo: 'combinacional',
    descricao:
      'Escolhe qual campo da instrução é o registrador de destino: com RegDst = 0 é o rt (Instruction [20–16], tipo I como lw e addi); com RegDst = 1 é o rd (Instruction [15–11], tipo R).',
    slide: 'Aula 06, p. 31',
  },
  regfile: {
    titulo: 'Banco de Registradores',
    naFigura: 'Registers',
    tipo: 'sequencial',
    descricao:
      'Permite a leitura de até dois registradores por vez (Read data 1 e Read data 2, de forma combinacional) e a escrita em apenas um (Write register), na borda de subida do clock, somente quando RegWrite = 1. O registrador $0 vale sempre 0.',
    slide: 'Aula 06, p. 18–20',
  },
  signExt: {
    titulo: 'Extensão de Sinal',
    naFigura: 'Sign extend',
    tipo: 'combinacional',
    descricao:
      'Transforma o imediato de 16 bits em 32 bits repetindo o bit 15 (o sinal) nos 16 bits de cima. Assim −1 (0xFFFF) continua −1 (0xFFFFFFFF).',
    slide: 'Aula 06 (tipo I)',
  },
  muxALUSrc: {
    titulo: 'Mux ALUSrc',
    naFigura: 'Mux',
    tipo: 'combinacional',
    descricao:
      'Escolhe a segunda entrada da ULA: com ALUSrc = 0 vem do banco de registradores (Read data 2); com ALUSrc = 1 vem direto da instrução, depois da extensão de sinal.',
    slide: 'Aula 06, p. 32',
  },
  aluControl: {
    titulo: 'Controle da ULA',
    naFigura: 'ALU control',
    tipo: 'controle',
    descricao:
      'Gera as 3 linhas de controle da ULA a partir de ALUOp e do funct: ALUOp 00 → soma (lw/sw), 01 → subtração (beq), 10 → o funct decide (add 010, sub 110, and 000, or 001, slt 111).',
    slide: 'Aula 06, p. 27–30',
  },
  alu: {
    titulo: 'ULA',
    naFigura: 'ALU',
    tipo: 'combinacional',
    descricao:
      'Realiza a operação definida pelo Controle da ULA. A saída Zero vale 1 quando o resultado é 0; é dessa forma que o beq compara dois registradores (realiza a subtração e verifica o sinal Zero).',
    slide: 'Aula 06, p. 27',
  },
  dmem: {
    titulo: 'Memória de Dados',
    naFigura: 'Data memory',
    tipo: 'sequencial',
    descricao:
      'Com MemRead = 1, coloca na saída a palavra do endereço calculado pela ULA (lw). Com MemWrite = 1, grava Write data nesse endereço na borda do clock (sw). Palavras em little-endian.',
    slide: 'Aula 06, p. 16 e 31–32',
  },
  muxMemtoReg: {
    titulo: 'Mux MemtoReg',
    naFigura: 'Mux',
    tipo: 'combinacional',
    descricao:
      'Escolhe o que é escrito no banco: com MemtoReg = 0 o resultado da ULA; com MemtoReg = 1 o dado lido da memória (lw).',
    slide: 'Aula 06, p. 31',
  },
  shiftBranch: {
    titulo: 'Shift left 2 (desvio)',
    naFigura: 'Shift left 2',
    tipo: 'combinacional',
    descricao:
      'Multiplica o deslocamento do beq por 4: o imediato é expresso em instruções (palavras), enquanto o PC é expresso em bytes.',
    slide: 'Aula 06 (desvio condicional)',
  },
  branchAdder: {
    titulo: 'Somador do desvio',
    naFigura: 'Add',
    tipo: 'combinacional',
    descricao: 'Calcula o endereço de destino do beq: PC + 4 + (imediato estendido × 4).',
    slide: 'Aula 06 (desvio condicional)',
  },
  branchAnd: {
    titulo: 'Porta AND (Branch · Zero)',
    tipo: 'combinacional',
    descricao:
      'O desvio é tomado somente se a instrução for beq (Branch = 1) e os registradores forem iguais (Zero = 1). A saída é o sinal PCSrc, que seleciona a entrada do multiplexador do desvio.',
    slide: 'Aula 06, p. 31 (sinal Branch)',
  },
  muxPCSrc: {
    titulo: 'Mux do desvio (PCSrc)',
    naFigura: 'Mux',
    tipo: 'combinacional',
    descricao: 'Com PCSrc = 0 o próximo PC é PC + 4; com PCSrc = 1 é o endereço de destino do beq.',
    slide: 'Aula 06, p. 31',
  },
  shiftJump: {
    titulo: 'Shift left 2 (jump)',
    naFigura: 'Shift left 2',
    tipo: 'combinacional',
    descricao:
      'Acrescenta dois zeros à direita do campo de 26 bits do jump, produzindo um valor de 28 bits.',
    slide: 'Aula 06, p. 43–45',
  },
  jumpConcat: {
    titulo: 'Endereço do jump',
    naFigura: 'Jump address [31–0]',
    tipo: 'combinacional',
    descricao:
      'Concatena os 4 bits mais significativos de PC + 4 com os 28 bits vindos do Shift left 2: {PC+4[31–28], endereço, 00}. Por isso, o j alcança apenas endereços da mesma região de 256 MB.',
    slide: 'Aula 06, p. 43–46',
  },
  muxJump: {
    titulo: 'Mux Jump',
    naFigura: 'Mux',
    tipo: 'combinacional',
    descricao:
      'Com Jump = 1, o próximo PC é o endereço do jump; caso contrário, é o valor proveniente do multiplexador do desvio. O jump tem prioridade.',
    slide: 'Aula 06, p. 48',
  },
};
