import { create } from 'zustand';
import { assemble, type AsmError, type AsmLine } from '../../../core/isa';
import { createState, step, type MonoState, type StepResult } from '../../../core/mono';
import { EXEMPLOS } from '../../../content/exemplos';
import { parseEstado, type ErroEstado } from './estadoInicial';

/** Número de fases visuais do ciclo (busca … escrita). */
export const NUM_FASES = 5;
/** Limite do histórico (voltar no tempo), para não crescer sem fim no "Rodar". */
export const MAX_HISTORICO = 5000;

export type Formato = 'dec' | 'hex';

export interface ExecucaoState {
  programa: string;
  estado: string;
  asmErrors: AsmError[];
  estadoErrors: ErroEstado[];
  /** Linhas do programa montado (para o painel da memória de instruções). */
  linhas: AsmLine[];
  /** history[0] = estado inicial; history[cursor] = estado atual (antes da borda). */
  history: MonoState[];
  cursor: number;
  /** Mostrar o ciclo em fases (1..NUM_FASES). Desligado = tudo de uma vez. */
  emFases: boolean;
  fase: number;
  rodando: boolean;
  /** Passos por segundo no "Rodar". */
  velocidade: number;
  formato: Formato;
  selecionado: string | null;
  breakpoints: number[];

  carregar: (programa: string, estado: string) => boolean;
  passo: () => void;
  voltar: () => void;
  reiniciar: () => void;
  irPara: (ciclo: number) => void;
  setRodando: (r: boolean) => void;
  setVelocidade: (v: number) => void;
  setEmFases: (v: boolean) => void;
  setFormato: (f: Formato) => void;
  selecionar: (id: string | null) => void;
  alternarBreakpoint: (pc: number) => void;
}

const cache = new WeakMap<MonoState, StepResult>();

/** Resultado do ciclo que parte de `s` (snapshot + próximo estado), com cache. */
export function ciclo(s: MonoState): StepResult {
  let r = cache.get(s);
  if (!r) {
    r = step(s);
    cache.set(s, r);
  }
  return r;
}

const inicial = EXEMPLOS[0]!;

export const useExecucao = create<ExecucaoState>()((set, get) => ({
  programa: inicial.programa,
  estado: inicial.estado,
  asmErrors: [],
  estadoErrors: [],
  linhas: [],
  history: [createState()],
  cursor: 0,
  emFases: false,
  fase: NUM_FASES,
  rodando: false,
  velocidade: 2,
  formato: 'dec',
  selecionado: null,
  breakpoints: [],

  carregar: (programa, estado) => {
    const asm = assemble(programa);
    const est = parseEstado(estado);
    const asmErrors = asm.ok ? [] : asm.errors;
    const estadoErrors = est.ok ? [] : est.errors;
    if (!asm.ok || !est.ok) {
      set({ programa, estado, asmErrors, estadoErrors, rodando: false });
      return false;
    }
    const s0 = createState({
      program: asm.program.words,
      regs: est.regs,
      dmemBytes: est.dmemBytes,
    });
    set({
      programa,
      estado,
      asmErrors,
      estadoErrors,
      linhas: asm.program.lines,
      history: [s0],
      cursor: 0,
      fase: get().emFases ? 1 : NUM_FASES,
      rodando: false,
      breakpoints: [],
    });
    return true;
  },

  passo: () => {
    const { emFases, fase, history, cursor } = get();
    if (emFases && fase < NUM_FASES) {
      set({ fase: fase + 1 });
      return;
    }
    let h = history;
    if (cursor + 1 >= h.length) {
      h = [...h, ciclo(h[cursor]!).next];
      if (h.length > MAX_HISTORICO) h = h.slice(h.length - MAX_HISTORICO);
    }
    const novoCursor = Math.min(cursor + 1, h.length - 1);
    set({ history: h, cursor: novoCursor, fase: emFases ? 1 : NUM_FASES });
  },

  voltar: () => {
    const { emFases, fase, cursor } = get();
    if (emFases && fase > 1) {
      set({ fase: fase - 1 });
      return;
    }
    if (cursor > 0) set({ cursor: cursor - 1, fase: NUM_FASES });
  },

  reiniciar: () => set({ cursor: 0, fase: get().emFases ? 1 : NUM_FASES, rodando: false }),

  irPara: (n) => {
    const { history } = get();
    const alvo = Math.max(0, Math.floor(n));
    const base = history[0]!.cycle;
    let h = history;
    while (h[h.length - 1]!.cycle - base < alvo && h.length < MAX_HISTORICO) {
      h = [...h, ciclo(h[h.length - 1]!).next];
    }
    const idx = h.findIndex((s) => s.cycle - base === alvo);
    set({
      history: h,
      cursor: idx === -1 ? h.length - 1 : idx,
      fase: NUM_FASES,
      rodando: false,
    });
  },

  setRodando: (rodando) => set({ rodando }),
  setVelocidade: (velocidade) => set({ velocidade }),
  setEmFases: (emFases) => set({ emFases, fase: emFases ? 1 : NUM_FASES }),
  setFormato: (formato) => set({ formato }),
  selecionar: (selecionado) => set({ selecionado }),
  alternarBreakpoint: (pc) => {
    const b = get().breakpoints;
    set({ breakpoints: b.includes(pc) ? b.filter((x) => x !== pc) : [...b, pc] });
  },
}));

/** Estado atual e o ciclo que parte dele. */
export function atual(s: Pick<ExecucaoState, 'history' | 'cursor'>): {
  estado: MonoState;
  resultado: StepResult;
} {
  const estado = s.history[s.cursor]!;
  return { estado, resultado: ciclo(estado) };
}
