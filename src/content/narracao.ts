import { bin, toSigned } from '../core/bits';
import type { Snapshot } from '../core/mono';

/**
 * "O que acontece" no datapath para a instrução do ciclo, em 5 etapas
 * (as mesmas fases visuais). Gerado a partir dos valores reais do snapshot.
 * Texto para a monitoria revisar.
 */
export interface Etapa {
  fase: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  itens: string[];
}

const OP_ULA: Record<number, [string, string]> = {
  0b000: ['AND', '&'],
  0b001: ['OR', '|'],
  0b010: ['soma', '+'],
  0b110: ['subtração', '−'],
  0b111: ['set on less than', '<'],
};

/** `v(id)` formata o valor de um fio (no formato escolhido na tela). */
export function narrar(s: Snapshot, v: (wire: string) => string): Etapa[] {
  const w = s.wires;
  const n = (id: string) => w[id]!;
  const d = s.decoded;
  const mn = d.ok ? d.instr.mnemonic : n('instr') === 0 ? 'nop' : '?';
  const tipo = d.ok ? d.spec.format : undefined;
  const reg = (id: string) => `$${n(id)}`;
  const ctl = OP_ULA[n('alu_ctl')] ?? ['operação inválida', '?'];
  const R = tipo === 'R';
  const lw = mn === 'lw';
  const sw = mn === 'sw';
  const beq = mn === 'beq';
  const j = mn === 'j';

  const busca: Etapa = {
    fase: 1,
    titulo: 'Busca',
    itens: [
      `O PC (${v('pc')}) vai para a Memória de Instruções, que devolve a instrução ${v('instr')} (${mn}).`,
      `Ao mesmo tempo, o somador calcula PC + 4 = ${v('pc_plus_4')}.`,
    ],
  };

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
      ? `O Controle recebe o opcode ${bin(n('opcode'), 6)} (${R ? 'tipo R' : mn}) e gera: ${sinais}.`
      : `O opcode ${bin(n('opcode'), 6)} não está na tabela: o Controle zera todos os sinais.`,
  ];
  if (!j) {
    deco.push(
      `O Banco de Registradores lê ${reg('rs')} = ${v('rd1')} (Read data 1) e ${reg('rt')} = ${v('rd2')} (Read data 2)${
        tipo === 'I' && !sw && !beq
          ? ' — o banco sempre lê os dois, mas aqui o Read data 2 não é usado'
          : ''
      }.`,
    );
  }
  if (tipo === 'I') {
    deco.push(
      `A Extensão de Sinal transforma o imediato de 16 bits (${toSigned(n('imm_ext'))}) em 32 bits: ${v('imm_ext')}.`,
    );
  }
  if (R) {
    deco.push(
      `Com ALUOp = 10, o Controle da ULA olha o funct ${bin(n('funct'), 6)} e escolhe ${ctl[0]} (${bin(n('alu_ctl'), 3)}).`,
    );
  } else if (!j) {
    deco.push(
      `Com ALUOp = ${bin(n('ALUOp'), 2)}, o Controle da ULA escolhe ${ctl[0]} (${bin(n('alu_ctl'), 3)}) sem olhar o funct.`,
    );
  }
  if (j) {
    deco.push(
      `O campo de 26 bits (${n('addr26')}) passa pelo Shift left 2 e vira ${n('jump_shifted')}.`,
    );
  }

  const exec: string[] = [];
  const segundo = n('ALUSrc') ? v('imm_ext') : v('rd2');
  if (j) {
    exec.push(
      `A ULA calcula alguma coisa (${v('alu_result')}), mas ninguém usa: o jump não precisa dela.`,
    );
    exec.push(`Endereço do salto = {PC+4[31–28], campo, 00} = ${v('jump_target')}.`);
  } else if (lw || sw) {
    exec.push(
      `ALUSrc = 1: a ULA soma a base e o deslocamento: ${v('rd1')} + ${v('imm_ext')} = ${v('alu_result')} (endereço na memória).`,
    );
  } else if (beq) {
    exec.push(
      `A ULA subtrai para comparar: ${v('rd1')} − ${v('rd2')} = ${v('alu_result')}, então Zero = ${n('zero')}.`,
    );
    exec.push(
      `O somador do desvio calcula PC + 4 + ${toSigned(n('imm_ext'))} × 4 = ${v('branch_target')}.`,
    );
    exec.push(
      n('pcsrc')
        ? 'Branch · Zero = 1: o desvio é tomado.'
        : 'Branch · Zero = 0: os registradores são diferentes, o desvio não é tomado.',
    );
  } else {
    exec.push(`A ULA faz ${ctl[0]}: ${v('rd1')} ${ctl[1]} ${segundo} = ${v('alu_result')}.`);
    if (n('ALUSrc'))
      exec.push('ALUSrc = 1: a segunda entrada da ULA é o imediato, não o registrador.');
  }

  const mem: string[] = [];
  if (lw)
    mem.push(`MemRead = 1: a Memória de Dados lê M[${v('alu_result')}] = ${v('mem_read_data')}.`);
  else if (sw)
    mem.push(
      `MemWrite = 1: a Memória de Dados vai gravar ${reg('rt')} = ${v('rd2')} em M[${v('alu_result')}] na borda do clock.`,
    );
  else mem.push('MemRead = 0 e MemWrite = 0: a Memória de Dados não é usada.');

  const esc: string[] = [];
  if (n('RegWrite') && n('write_reg') !== 0) {
    esc.push(
      `RegDst = ${n('RegDst')} escolhe ${n('RegDst') ? 'rd' : 'rt'} (${reg('write_reg')}) como destino; MemtoReg = ${n('MemtoReg')} escolhe ${n('MemtoReg') ? 'o dado da memória' : 'o resultado da ULA'}.`,
    );
    esc.push(`Na borda do clock: ${reg('write_reg')} ← ${v('write_data')}.`);
  } else if (n('RegWrite')) {
    esc.push('O destino é $0, que vale sempre 0: nada muda no banco.');
  } else {
    esc.push('RegWrite = 0: o banco de registradores não é escrito.');
  }
  if (sw) esc.push(`Na borda do clock: M[${v('alu_result')}] ← ${v('rd2')}.`);
  esc.push(
    j
      ? `Jump = 1: PC ← ${v('next_pc')}.`
      : beq && n('pcsrc')
        ? `PC ← ${v('next_pc')} (destino do desvio).`
        : `PC ← ${v('next_pc')} (PC + 4).`,
  );

  return [
    busca,
    { fase: 2, titulo: 'Decodificação e leitura', itens: deco },
    { fase: 3, titulo: 'Execução', itens: exec },
    { fase: 4, titulo: 'Memória', itens: mem },
    { fase: 5, titulo: 'Escrita', itens: esc },
  ];
}
