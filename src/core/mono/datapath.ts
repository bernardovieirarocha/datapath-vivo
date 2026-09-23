import type { ComponentSpec, Netlist, PortRef, WireKind, WireSpec } from '../netlist';

/**
 * Netlist do datapath monociclo da aula (Aula 06, slide com jump; P&H fig. 4.24).
 * Os ids dos fios são as chaves do snapshot e os ids do SVG.
 */

export type MonoKind =
  | 'const'
  | 'pc'
  | 'imem'
  | 'fields'
  | 'control'
  | 'mux'
  | 'regfile'
  | 'signExt'
  | 'aluControl'
  | 'alu'
  | 'dmem'
  | 'adder'
  | 'shiftLeft2'
  | 'and'
  | 'jumpConcat';

type C = ComponentSpec<MonoKind>;

const out = (name: string, ...deps: string[]) => ({ name, deps });

const mux = (id: string, label: string): C => ({
  id,
  kind: 'mux',
  label,
  inputs: ['sel', 'in0', 'in1'],
  outputs: [out('out', 'sel', 'in0', 'in1')],
});

const COMPONENTS: readonly C[] = [
  {
    id: 'const4',
    kind: 'const',
    label: '4',
    inputs: [],
    outputs: [out('out')],
    params: { value: 4 },
  },
  {
    id: 'pc',
    kind: 'pc',
    label: 'PC',
    inputs: ['in'],
    edgeInputs: ['in'],
    outputs: [out('out')],
  },
  {
    id: 'pcAdder',
    kind: 'adder',
    label: 'Somador PC+4',
    inputs: ['a', 'b'],
    outputs: [out('sum', 'a', 'b')],
  },
  {
    id: 'imem',
    kind: 'imem',
    label: 'Memória de Instruções',
    inputs: ['address'],
    outputs: [out('instruction', 'address')],
  },
  {
    id: 'fields',
    kind: 'fields',
    label: 'Campos da instrução',
    inputs: ['instruction'],
    outputs: [
      out('opcode', 'instruction'),
      out('rs', 'instruction'),
      out('rt', 'instruction'),
      out('rd', 'instruction'),
      out('imm16', 'instruction'),
      out('funct', 'instruction'),
      out('addr26', 'instruction'),
    ],
  },
  {
    id: 'control',
    kind: 'control',
    label: 'Controle',
    inputs: ['opcode'],
    outputs: [
      'RegDst',
      'Branch',
      'MemRead',
      'MemtoReg',
      'ALUOp',
      'MemWrite',
      'ALUSrc',
      'RegWrite',
      'Jump',
    ].map((s) => out(s, 'opcode')),
  },
  mux('muxRegDst', 'Mux RegDst'),
  {
    id: 'regfile',
    kind: 'regfile',
    label: 'Banco de Registradores',
    inputs: ['read1', 'read2', 'writeReg', 'writeData', 'regWrite'],
    edgeInputs: ['writeReg', 'writeData', 'regWrite'],
    outputs: [out('data1', 'read1'), out('data2', 'read2')],
  },
  {
    id: 'signExt',
    kind: 'signExt',
    label: 'Extensão de Sinal',
    inputs: ['in'],
    outputs: [out('out', 'in')],
  },
  mux('muxALUSrc', 'Mux ALUSrc'),
  {
    id: 'aluControl',
    kind: 'aluControl',
    label: 'Controle da ULA',
    inputs: ['aluOp', 'funct'],
    outputs: [out('op', 'aluOp', 'funct')],
  },
  {
    id: 'alu',
    kind: 'alu',
    label: 'ULA',
    inputs: ['a', 'b', 'op'],
    outputs: [out('result', 'a', 'b', 'op'), out('zero', 'a', 'b', 'op')],
  },
  {
    id: 'dmem',
    kind: 'dmem',
    label: 'Memória de Dados',
    inputs: ['address', 'writeData', 'memRead', 'memWrite'],
    edgeInputs: ['writeData', 'memWrite'],
    outputs: [out('readData', 'address', 'memRead')],
  },
  mux('muxMemtoReg', 'Mux MemtoReg'),
  {
    id: 'shiftBranch',
    kind: 'shiftLeft2',
    label: 'Shift left 2',
    inputs: ['in'],
    outputs: [out('out', 'in')],
  },
  {
    id: 'branchAdder',
    kind: 'adder',
    label: 'Somador do desvio',
    inputs: ['a', 'b'],
    outputs: [out('sum', 'a', 'b')],
  },
  {
    id: 'branchAnd',
    kind: 'and',
    label: 'AND (Branch · Zero)',
    inputs: ['a', 'b'],
    outputs: [out('out', 'a', 'b')],
  },
  mux('muxPCSrc', 'Mux PCSrc'),
  {
    id: 'shiftJump',
    kind: 'shiftLeft2',
    label: 'Shift left 2',
    inputs: ['in'],
    outputs: [out('out', 'in')],
  },
  {
    id: 'jumpConcat',
    kind: 'jumpConcat',
    label: '{PC+4[31:28], …}',
    inputs: ['pcPlus4', 'shifted'],
    outputs: [out('out', 'pcPlus4', 'shifted')],
  },
  mux('muxJump', 'Mux Jump'),
];

const p = (ref: string): PortRef => {
  const [component, port] = ref.split('.') as [string, string];
  return { component, port };
};

const w = (id: string, width: number, kind: WireKind, from: string, ...to: string[]): WireSpec => ({
  id,
  width,
  kind,
  from: p(from),
  to: to.map(p),
});

// prettier-ignore
const WIRES: readonly WireSpec[] = [
  w('const_4',          32, 'dados',     'const4.out',         'pcAdder.b'),
  w('pc',               32, 'endereco',  'pc.out',             'imem.address', 'pcAdder.a'),
  w('pc_plus_4',        32, 'endereco',  'pcAdder.sum',        'muxPCSrc.in0', 'branchAdder.a', 'jumpConcat.pcPlus4'),
  w('instr',            32, 'instrucao', 'imem.instruction',   'fields.instruction'),
  w('opcode',            6, 'instrucao', 'fields.opcode',      'control.opcode'),
  w('rs',                5, 'instrucao', 'fields.rs',          'regfile.read1'),
  w('rt',                5, 'instrucao', 'fields.rt',          'regfile.read2', 'muxRegDst.in0'),
  w('rd',                5, 'instrucao', 'fields.rd',          'muxRegDst.in1'),
  w('imm16',            16, 'instrucao', 'fields.imm16',       'signExt.in'),
  w('funct',             6, 'instrucao', 'fields.funct',       'aluControl.funct'),
  w('addr26',           26, 'instrucao', 'fields.addr26',      'shiftJump.in'),
  w('RegDst',            1, 'controle',  'control.RegDst',     'muxRegDst.sel'),
  w('Branch',            1, 'controle',  'control.Branch',     'branchAnd.a'),
  w('MemRead',           1, 'controle',  'control.MemRead',    'dmem.memRead'),
  w('MemtoReg',          1, 'controle',  'control.MemtoReg',   'muxMemtoReg.sel'),
  w('ALUOp',             2, 'controle',  'control.ALUOp',      'aluControl.aluOp'),
  w('MemWrite',          1, 'controle',  'control.MemWrite',   'dmem.memWrite'),
  w('ALUSrc',            1, 'controle',  'control.ALUSrc',     'muxALUSrc.sel'),
  w('RegWrite',          1, 'controle',  'control.RegWrite',   'regfile.regWrite'),
  w('Jump',              1, 'controle',  'control.Jump',       'muxJump.sel'),
  w('write_reg',         5, 'instrucao', 'muxRegDst.out',      'regfile.writeReg'),
  w('rd1',              32, 'dados',     'regfile.data1',      'alu.a'),
  w('rd2',              32, 'dados',     'regfile.data2',      'muxALUSrc.in0', 'dmem.writeData'),
  w('imm_ext',          32, 'dados',     'signExt.out',        'muxALUSrc.in1', 'shiftBranch.in'),
  w('alu_b',            32, 'dados',     'muxALUSrc.out',      'alu.b'),
  w('alu_ctl',           3, 'controle',  'aluControl.op',      'alu.op'),
  w('alu_result',       32, 'dados',     'alu.result',         'dmem.address', 'muxMemtoReg.in0'),
  w('zero',              1, 'controle',  'alu.zero',           'branchAnd.b'),
  w('mem_read_data',    32, 'dados',     'dmem.readData',      'muxMemtoReg.in1'),
  w('write_data',       32, 'dados',     'muxMemtoReg.out',    'regfile.writeData'),
  w('branch_offset',    32, 'endereco',  'shiftBranch.out',    'branchAdder.b'),
  w('branch_target',    32, 'endereco',  'branchAdder.sum',    'muxPCSrc.in1'),
  w('pcsrc',             1, 'controle',  'branchAnd.out',      'muxPCSrc.sel'),
  w('pc_branch_or_seq', 32, 'endereco',  'muxPCSrc.out',       'muxJump.in0'),
  w('jump_shifted',     28, 'endereco',  'shiftJump.out',      'jumpConcat.shifted'),
  w('jump_target',      32, 'endereco',  'jumpConcat.out',     'muxJump.in1'),
  w('next_pc',          32, 'endereco',  'muxJump.out',        'pc.in'),
];

export const MONO_NETLIST: Netlist<MonoKind> = { components: COMPONENTS, wires: WIRES };
