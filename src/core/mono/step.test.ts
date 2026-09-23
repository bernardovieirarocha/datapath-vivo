import { describe, expect, it } from 'vitest';
import { toSigned, u32 } from '../bits';
import { assemble, formatAsmError } from '../isa';
import { validateNetlist } from '../netlist';
import { computeActivity } from './activity';
import { dmemWord } from './components';
import { MONO_NETLIST } from './datapath';
import { createState, PRATICA10_INITIAL, type InitialState, type MonoState } from './state';
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
    const { wires } = evaluate(createState(PRATICA10_INITIAL));
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
    const s = createState(PRATICA10_INITIAL);
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
    expect(() => createState({ dmemBytes: { 64: 1 } })).toThrow(RangeError);
    expect(() => createState({ program: new Array(33).fill(0) })).toThrow(RangeError);
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
    // Não dá para ter Branch e Jump juntos com o controle do lab; o mux em cascata garante:
    const s = prog('j 12\nnop\nnop\nnop');
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
    expect(r.snapshot.wires['overflow']).toBe(1);
    expect(toSigned(r.next.regs[3]!)).toBe(-(2 ** 31));
    expect(r.snapshot.alerts).toEqual([]);
    expect(r.snapshot.internals.alu.ovAddSub).toBe(1);
  });

  it('decodifica a instrução do ciclo', () => {
    const d = step(createState(PRATICA10_INITIAL)).snapshot.decoded;
    expect(d.ok && d.instr).toEqual({ mnemonic: 'beq', rs: 8, rt: 9, imm: 1 });
  });
});

describe('reset', () => {
  it('PC vai a 0 no mesmo ciclo (assíncrono) e escritas ficam desabilitadas', () => {
    let s = prog('nop\naddi $1, $0, 1\nsw $1, 0($0)', {});
    s = { ...s, pc: 4 };
    const r = step(s, { reset: true });
    expect(r.snapshot.reset).toBe(true);
    expect(r.snapshot.wires['reset']).toBe(1);
    expect(r.snapshot.wires['pc']).toBe(0);
    expect(r.next.pc).toBe(0);

    // mesmo com RegWrite = 1 na instrução, a escrita não acontece
    const s2 = { ...prog('addi $1, $0, 1'), pc: 0 };
    const r2 = step(s2, { reset: true });
    expect(r2.snapshot.wires['RegWrite']).toBe(1);
    expect(r2.snapshot.wires['reg_write_enable']).toBe(0);
    expect(r2.next.regs[1]).toBe(0);

    const s3 = prog('sw $1, 0($0)', { regs: { 1: 9 } });
    const r3 = step(s3, { reset: true });
    expect(r3.snapshot.wires['mem_write_enable']).toBe(0);
    expect(r3.next.dmem[0]).toBe(0);
  });

  it('não mexe em registradores e memória (só o PC)', () => {
    const s = { ...createState(PRATICA10_INITIAL), pc: 16 };
    const r = step(s, { reset: true });
    expect(r.next.regs).toBe(s.regs);
    expect(r.next.dmem).toBe(s.dmem);
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

  it('acesso à memória de dados ≥ 64', () => {
    const r = step(prog('lw $1, 64($0)'));
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-fora-da-memoria']);
    expect(r.next.regs[1]).toBe(0);
    const w = step(prog('sw $1, 60($2)', { regs: { 1: 5, 2: 4 } }));
    expect(w.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-fora-da-memoria']);
    expect(w.snapshot.writes.mem?.bytes).toEqual([]);
  });

  it('endereço ≥ 256 dá a volta (só address[7:2])', () => {
    const r = step(prog('lw $1, 256($0)', { dmemBytes: { 0: 9 } }));
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-endereco-alto']);
    expect(r.next.regs[1]).toBe(9);
  });

  it('endereço desalinhado: 2 bits de baixo ignorados', () => {
    const r = step(prog('lw $1, 2($0)', { dmemBytes: { 0: 9 } }));
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['dmem-desalinhado']);
    expect(r.next.regs[1]).toBe(9);
  });

  it('sem acesso à memória, endereço "estranho" na ULA não gera alerta', () => {
    const r = step(prog('addi $1, $0, 1000'));
    expect(r.snapshot.alerts).toEqual([]);
  });

  it('PC além da memória de instruções dá a volta', () => {
    const s = { ...createState({ program: [0x21080002] }), pc: 128 };
    const r = step(s);
    expect(r.snapshot.alerts.map((a) => a.code)).toEqual(['pc-alem-da-imem']);
    expect(r.snapshot.wires['instr']).toBe(0x21080002);
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
    for (const id of [
      'imm_ext',
      'mem_read_data',
      'branch_target',
      'jump_target',
      'MemRead',
      'overflow',
    ]) {
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
    for (const id of ['rd2', 'alu_result', 'MemWrite', 'mem_write_enable', 'imm_ext']) {
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

  it('reset: só o reset alimenta o PC', () => {
    const a = computeActivity(step(createState(PRATICA10_INITIAL), { reset: true }).snapshot);
    expect(a.wires.has('reset')).toBe(true);
    expect(a.wires.has('next_pc')).toBe(false);
  });
});

describe('run', () => {
  it('devolve estados (com o inicial) e snapshots', () => {
    const { states, snapshots } = run(createState(PRATICA10_INITIAL), 5);
    expect(states).toHaveLength(6);
    expect(snapshots).toHaveLength(5);
    expect(states.map((s) => s.pc)).toEqual([0, 8, 12, 16, 20, 0]);
    expect(u32(states[5]!.regs[8]!)).toBe(4);
  });
});
