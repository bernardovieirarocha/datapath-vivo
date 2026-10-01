import { bin, toSigned } from '../core/bits';
import type { Snapshot } from '../core/mono';

/**
 * Execução da instrução em 5 etapas (as mesmas fases visuais), gerada a partir dos
 * valores reais do snapshot. Registro formal: cada unidade funcional recebe valores
 * na entrada e apresenta um resultado na saída (Aula 06; P&H cap. 4).
 * Texto para a monitoria revisar.
 */
export interface Etapa {
  fase: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  itens: string[];
}

/** Nomes das etapas (botões e títulos). */
export const TITULOS_ETAPAS = [
  'Busca',
  'Decodificação',
  'Execução',
  'Acesso à memória',
  'Escrita do resultado',
] as const;

const OP_ULA: Record<number, [string, string]> = {
  0b000: ['AND', '&'],
  0b001: ['OR', '|'],
  0b010: ['soma', '+'],
  0b110: ['subtração', '−'],
  0b111: ['set on less than (slt)', '<'],
};

/** `v(id)` formata o valor de um fio (no formato escolhido na tela). */
export function narrar(s: Snapshot, v: (wire: string) => string): Etapa[] {
  const w = s.wires;
  const n = (id: string) => w[id]!;
  const d = s.decoded;
  const mn = d.ok ? d.instr.mnemonic : n('instr') === 0 ? 'nop' : '?';
  const tipo = d.ok ? d.spec.format : undefined;
  const reg = (id: string) => `$${n(id)}`;
  const ctl = OP_ULA[n('alu_ctl')] ?? ['operação não definida', '?'];
  const R = tipo === 'R';
  const lw = mn === 'lw';
  const sw = mn === 'sw';
  const beq = mn === 'beq';
  const j = mn === 'j';

  const busca = [
    `A Memória de Instruções recebe na entrada o endereço armazenado no PC (${v('pc')}) e apresenta na saída a instrução armazenada nesse endereço: ${v('instr')} (${mn}).`,
    `Simultaneamente, o somador calcula PC + 4 = ${v('pc_plus_4')}, o endereço da instrução seguinte.`,
  ];

  const sinais = [
    'RegDst',
    'Jump',
    'Branch',
    'MemRead',
    'MemtoReg',
    'ALUOp',
    'MemWrite',
    'ALUSrc',
    'RegWrite',
  ]
    .map((x) => `${x} = ${x === 'ALUOp' ? bin(n(x), 2) : n(x)}`)
    .join(', ');
  const deco: string[] = [
    d.ok
      ? `A Unidade de Controle recebe o opcode (bits 31–26 = ${bin(n('opcode'), 6)}, ${R ? 'formato R' : mn}) e gera os sinais de controle: ${sinais}.`
      : `O opcode ${bin(n('opcode'), 6)} não consta na tabela de controle; a Unidade de Controle mantém todos os sinais em 0.`,
  ];
  if (!j) {
    deco.push(
      `O Banco de Registradores recebe os campos rs (${reg('rs')}) e rt (${reg('rt')}) e apresenta nas saídas Read data 1 = ${v('rd1')} e Read data 2 = ${v('rd2')}.${
        tipo === 'I' && !sw && !beq
          ? ' Os dois registradores são sempre lidos; nesta instrução, o valor de Read data 2 não é utilizado.'
          : ''
      }`,
    );
  }
  if (tipo === 'I') {
    deco.push(
      `A Extensão de Sinal converte o imediato de 16 bits (${toSigned(n('imm_ext'))}) em um valor de 32 bits: ${v('imm_ext')}.`,
    );
  }
  if (R) {
    deco.push(
      `O Controle da ULA recebe ALUOp = 10 e o campo funct (${bin(n('funct'), 6)}) e define a operação ${ctl[0]} (${bin(n('alu_ctl'), 3)}).`,
    );
  } else if (!j) {
    deco.push(
      `O Controle da ULA recebe ALUOp = ${bin(n('ALUOp'), 2)} e define a operação ${ctl[0]} (${bin(n('alu_ctl'), 3)}), sem considerar o campo funct.`,
    );
  }
  if (j) {
    deco.push(
      `O campo de endereço de 26 bits (${n('addr26')}) passa pelo Shift left 2 e resulta em ${n('jump_shifted')} (28 bits).`,
    );
  }

  const exec: string[] = [];
  const segundo = n('ALUSrc') ? v('imm_ext') : v('rd2');
  if (j) {
    exec.push(
      `A ULA produz um resultado (${v('alu_result')}), mas ele não é utilizado: o desvio incondicional não depende da ULA.`,
    );
    exec.push(
      `O endereço de destino é formado pela concatenação {PC+4[31–28], endereço, 00} = ${v('jump_target')}.`,
    );
  } else if (lw || sw) {
    exec.push(
      `Com ALUSrc = 1, a ULA recebe Read data 1 (${v('rd1')}) e o imediato estendido (${v('imm_ext')}) e calcula a soma ${v('alu_result')}, que corresponde ao endereço na Memória de Dados.`,
    );
  } else if (beq) {
    exec.push(
      `A ULA recebe Read data 1 (${v('rd1')}) e Read data 2 (${v('rd2')}) e realiza a subtração: ${v('rd1')} − ${v('rd2')} = ${v('alu_result')}; portanto, Zero = ${n('zero')}.`,
    );
    exec.push(
      `O somador do desvio calcula o endereço de destino: PC + 4 + ${toSigned(n('imm_ext'))} × 4 = ${v('branch_target')}.`,
    );
    exec.push(
      n('pcsrc')
        ? 'Como Branch = 1 e Zero = 1, a porta AND produz PCSrc = 1: o desvio é tomado.'
        : 'Como Zero = 0 (os registradores são diferentes), a porta AND produz PCSrc = 0: o desvio não é tomado.',
    );
  } else {
    exec.push(
      `A ULA recebe ${v('rd1')} e ${segundo} e realiza a operação ${ctl[0]}: ${v('rd1')} ${ctl[1]} ${segundo} = ${v('alu_result')}.`,
    );
    if (n('ALUSrc')) {
      exec.push(
        'Com ALUSrc = 1, a segunda entrada da ULA é o imediato estendido, e não um registrador.',
      );
    }
  }

  const mem: string[] = [];
  if (lw) {
    mem.push(
      `A Memória de Dados recebe o endereço ${v('alu_result')} e, com MemRead = 1, apresenta na saída o dado armazenado: ${v('mem_read_data')}.`,
    );
  } else if (sw) {
    mem.push(
      `A Memória de Dados recebe o endereço ${v('alu_result')} e o dado de ${reg('rt')} (${v('rd2')}); com MemWrite = 1, a escrita ocorre na borda de subida do clock.`,
    );
  } else {
    mem.push('Esta instrução não acessa a Memória de Dados (MemRead = 0 e MemWrite = 0).');
  }

  const esc: string[] = [];
  if (n('RegWrite') && n('write_reg') !== 0) {
    esc.push(
      `O multiplexador RegDst = ${n('RegDst')} seleciona o campo ${n('RegDst') ? 'rd' : 'rt'} (${reg('write_reg')}) como registrador de destino, e o multiplexador MemtoReg = ${n('MemtoReg')} seleciona ${n('MemtoReg') ? 'o dado lido da Memória de Dados' : 'o resultado da ULA'}.`,
    );
    esc.push(`Na borda de subida do clock, ${reg('write_reg')} recebe ${v('write_data')}.`);
  } else if (n('RegWrite')) {
    esc.push(
      'O registrador de destino é o $0, cujo valor é sempre 0: o Banco de Registradores não é alterado.',
    );
  } else {
    esc.push('Com RegWrite = 0, o Banco de Registradores não é escrito.');
  }
  if (sw) esc.push(`Na borda de subida do clock, M[${v('alu_result')}] recebe ${v('rd2')}.`);
  esc.push(
    j
      ? `Com Jump = 1, o PC recebe o endereço de destino do salto: ${v('next_pc')}.`
      : beq && n('pcsrc')
        ? `O PC recebe o endereço de destino do desvio: ${v('next_pc')}.`
        : `O PC recebe ${v('next_pc')} (PC + 4).`,
  );

  return [
    { fase: 1, titulo: TITULOS_ETAPAS[0], itens: busca },
    { fase: 2, titulo: TITULOS_ETAPAS[1], itens: deco },
    { fase: 3, titulo: TITULOS_ETAPAS[2], itens: exec },
    { fase: 4, titulo: TITULOS_ETAPAS[3], itens: mem },
    { fase: 5, titulo: TITULOS_ETAPAS[4], itens: esc },
  ];
}
