import { describe, expect, it } from 'vitest';
import { toSigned, u32 } from '../bits';
import { assemble, formatAsmError } from '../isa';
import { validateNetlist } from '../netlist';
import { computeActivity } from './activity';
import { dmemWord } from './components';
import { MONO_NETLIST } from './datapath';
import { createState, EXEMPLO_INITIAL, type InitialState, type MonoState } from './state';
import { evaluate, run, step } from './step';

function prog(src: string, init: Omit<InitialState, 'program'> = {}): MonoState {
  const r = assemble(src);
  if (!r.ok) throw new Error(r.errors.map(formatAsmError).join('\n'));
  return createState({ ...init, program: r.program.words });
}

describe('netlist monociclo', () => {
  it('é consistente: portas, larguras, uma origem por entrada, sem laço', () => {
    expect(validateNetlist(MONO_NETLIST)).toEqual([]);
  });

  it('snapshot tem valor para todo fio da netlist, na largura do fio', () => {
    const { wires } = evaluate(createState(EXEMPLO_INITIAL));
    for (const w of MONO_NETLIST.wires) {
      const v = wires[w.id];
      expect(v, w.id).toBeDefined();
      expect(v! < 2 ** w.width, w.id).toBe(true);
    }
    expect(Object.keys(wires).length).toBe(MONO_NETLIST.wires.length);
  });
});

describe('step', () => {
  it('é puro: não altera o estado de entrada', () => {
    const s = createState(EXEMPLO_INITIAL);
    const copy = structuredClone(s);
    run(s, 12);
    expect(s).toEqual(copy);
  });

  it('registra as escritas da borda (antes → depois)', () => {
    const s = prog('addi $8, $8, 2\nsw $8, 4($0)', { regs: { 8: 5 } });
    const a = step(s);
    expect(a.snapshot.writes).toEqual({
      pc: { before: 0, after: 4 },
      reg: { index: 8, before: 5, after: 7 },
    });
    const b = step(a.next);
    expect(b.snapshot.writes.reg).toBeUndefined();
    expect(b.snapshot.writes.mem).toEqual({
      address: 4,
      bytes: [
        { index: 4, before: 0, after: 7 },
        { index: 5, before: 0, after: 0 },
        { index: 6, before: 0, after: 0 },
        { index: 7, before: 0, after: 0 },
      ],
    });
    expect(dmemWord(b.next.dmem, 4)).toBe(7);
  });

  it('$0 é sempre 0: escrita ignorada, leitura dá 0', () => {
    const s = prog('addi $0, $0, 5\nadd $1, $0, $0');
    const a = step(s);
    expect(a.snapshot.writes.reg).toBeUndefined();
    expect(a.next.regs[0]).toBe(0);
    expect(a.snapshot.wires['write_reg']).toBe(0);
    expect(step(a.next).snapshot.wires['rd1']).toBe(0);
  });

  it('createState ignora valor inicial para $0 e valida entradas', () => {
    expect(createState({ regs: { 0: 9 } }).regs[0]).toBe(0);
    expect(() => createState({ regs: { 32: 1 } })).toThrow(RangeError);
    expect(() => createState({ dmemBytes: { 256: 1 } })).toThrow(RangeError);
    expect(() => createState({ program: new Array(65).fill(0) })).toThrow(RangeError);
    expect(createState({ dmemBytes: { 3: 0x1ff } }).dmem[3]).toBe(0xff);
  });

  it('lw lê little-endian; mem_read_data = 0 quando MemRead = 0', () => {
    const s = prog('lw $1, 8($0)\nadd $2, $1, $1', {
      dmemBytes: { 8: 0x44, 9: 0x33, 10: 0x22, 11: 0x11 },
    });
    const a = step(s);
    expect(a.next.regs[1]).toBe(0x11223344);
    expect(step(a.next).snapshot.wires['mem_read_data']).toBe(0);
  });

  it('jump tem prioridade sobre o desvio', () => {
    // Não dá para ter Branch e Jump juntos com esse controle; o mux em cascata garante:
    const s = prog('j 3 # campo 3 = endereço 12\nnop\nnop\nnop');
    expect(step(s).next.pc).toBe(12);
  });

  it('beq com offset negativo volta', () => {
    const s = prog('nop\nbeq $0, $0, -2');
    const { next } = step(step(s).next);
    expect(next.pc).toBe(0);
  });

  it('overflow é calculado e não usado (sem exceção)', () => {
    const s = prog('add $3, $1, $2', { regs: { 1: 0x7fffffff, 2: 1 } });
    const r = step(s);
    expect(r.snapshot.internals.alu.overflow).toBe(1);
    expect(toSigned(r.next.regs[3]!)).toBe(-(2 ** 31));
    expect(r.snapshot.alerts).toEqual([]);
  });

  it('decodifica a instrução do ciclo', () => {
    const d = step(createState(EXEMPLO_INITIAL)).snapshot.decoded;
    expect(d.ok && d.instr).toEqual({ mnemonic: 'beq', rs: 8, rt: 9, imm: 1 });
  });
});

describe('alertas', () => {
  it('opcode desconhecido: controle zerado, segue para PC+4', () => {
    const s = createState({ program: [0xfc000000] });
    const r = step(s);
    expect(r.snapshot.alerts).toEqual([
      { code: 'opcode-desconhecido', component: 'control', value: 0b111111 },
    ]);
    expect(r.next.pc).toBe(4);
    expect(r.snapshot.writes.reg).toBeUndefined();
  });

  it('funct desconhecido (0x00000000): ULA faz AND, escreve em $0 (nada muda)', () => {
    const r = step(createState({ program: [] }));
    expect(r.snapshot.alerts).toEqual([
      { code: 'funct-desconhecido', component: 'aluControl', value: 0 },
    ]);
    expect(r.snapshot.wires['alu_ctl']).toBe(0b000);
    expect(r.snapshot.writes.reg).toBeUndefined();
  });

  it('lw/sw fora da memória de dados simulada (256 bytes)', () => {
    const r = step(prog('lw $1, 256($0)', { regs: { 1: 7 } }));
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-fora-da-memoria']);
    expect(r.next.regs[1]).toBe(0);
    const w = step(prog('sw $1, 252($2)', { regs: { 1: 5, 2: 4 } }));
    expect(w.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-fora-da-memoria']);
    expect(w.snapshot.writes.mem).toBeUndefined();
    expect(w.next.dmem).toBe(w.next.dmem);
    // última palavra válida: 252..255
    const ok = step(prog('sw $1, 252($0)', { regs: { 1: 5 } }));
    expect(ok.snapshot.alerts).toEqual([]);
    expect(dmemWord(ok.next.dmem, 252)).toBe(5);
  });

  it('endereço desalinhado: o simulador alinha e avisa', () => {
    const r = step(prog('lw $1, 2($0)', { dmemBytes: { 0: 9 } }));
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-desalinhado']);
    expect(r.next.regs[1]).toBe(9);
    const w = step(prog('sw $1, 5($0)', { regs: { 1: 3 } }));
    expect(w.snapshot.writes.mem?.address).toBe(4);
  });

  it('sem acesso à memória, endereço "estranho" na ULA não gera alerta', () => {
    const r = step(prog('addi $1, $0, 1000'));
    expect(r.snapshot.alerts).toEqual([]);
  });

  it('PC fora da memória de instruções lê 0x00000000', () => {
    const s = { ...createState({ program: [0x21080002] }), pc: 256 };
    const r = step(s);
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['pc-fora-da-imem', 'funct-desconhecido']);
    expect(r.snapshot.wires['instr']).toBe(0);
  });
});

describe('atividade (fios acesos)', () => {
  const activeAfter = (src: string, init: Omit<InitialState, 'program'> = {}) =>
    computeActivity(step(prog(src, init)).snapshot);

  it('tipo R: banco + ULA; imediato, memória de dados e jump apagados', () => {
    const a = activeAfter('add $3, $1, $2');
    for (const id of [
      'pc',
      'instr',
      'rs',
      'rt',
      'rd',
      'rd1',
      'rd2',
      'alu_b',
      'alu_ctl',
      'funct',
      'alu_result',
      'write_data',
      'write_reg',
      'RegDst',
      'RegWrite',
      'ALUOp',
      'pc_plus_4',
      'next_pc',
    ]) {
      expect(a.wires.has(id), id).toBe(true);
    }
    for (const id of ['imm_ext', 'mem_read_data', 'branch_target', 'jump_target', 'MemRead']) {
      expect(a.wires.has(id), id).toBe(false);
    }
    expect(a.components.has('dmem')).toBe(false);
    expect(a.components.has('regfile')).toBe(true);
    // Seletores de mux em caminho ativo ficam acesos mesmo valendo 0
    expect(a.wires.has('ALUSrc')).toBe(true);
    expect(a.wires.has('MemtoReg')).toBe(true);
    expect(a.wires.has('Jump')).toBe(true);
  });

  it('lw: memória de dados lida entra no caminho', () => {
    const a = activeAfter('lw $1, 0($2)');
    for (const id of ['imm_ext', 'alu_b', 'alu_result', 'mem_read_data', 'MemRead', 'MemtoReg']) {
      expect(a.wires.has(id), id).toBe(true);
    }
    expect(a.wires.has('rd2')).toBe(false);
    expect(a.components.has('dmem')).toBe(true);
  });

  it('sw: memória escrita, sem write-back', () => {
    const a = activeAfter('sw $1, 0($2)');
    for (const id of ['rd2', 'alu_result', 'MemWrite', 'imm_ext']) {
      expect(a.wires.has(id), id).toBe(true);
    }
    for (const id of ['write_data', 'write_reg', 'mem_read_data']) {
      expect(a.wires.has(id), id).toBe(false);
    }
  });

  it('beq tomado: alvo do desvio aceso; não tomado: só PC+4', () => {
    const t = activeAfter('beq $1, $2, 3');
    expect(t.wires.has('branch_target')).toBe(true);
    expect(t.wires.has('zero')).toBe(true);
    expect(t.wires.has('Branch')).toBe(true);
    const n = activeAfter('beq $1, $2, 3', { regs: { 1: 1 } });
    expect(n.wires.has('pcsrc')).toBe(true);
    expect(n.wires.has('branch_target')).toBe(false);
    // Zero ainda influencia a decisão (via AND → PCSrc)
    expect(n.wires.has('zero')).toBe(true);
  });

  it('j: só o caminho do salto; a ULA calcula, mas não importa', () => {
    const a = activeAfter('j 0');
    for (const id of ['jump_target', 'jump_shifted', 'addr26', 'pc_plus_4', 'Jump']) {
      expect(a.wires.has(id), id).toBe(true);
    }
    for (const id of ['rd1', 'alu_result', 'zero', 'ALUOp', 'pc_branch_or_seq']) {
      expect(a.wires.has(id), id).toBe(false);
    }
    expect(a.components.has('alu')).toBe(false);
  });
});

describe('run', () => {
  it('devolve estados (com o inicial) e snapshots', () => {
    const { states, snapshots } = run(createState(EXEMPLO_INITIAL), 5);
    expect(states).toHaveLength(6);
    expect(snapshots).toHaveLength(5);
    expect(states.map((s) => s.pc)).toEqual([0, 8, 12, 16, 20, 0]);
    expect(u32(states[5]!.regs[8]!)).toBe(4);
  });
});
