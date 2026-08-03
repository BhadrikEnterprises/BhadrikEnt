import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppData, Client, Loan, Repayment, Settings } from './types';

const STORAGE_KEY = 'lendbook_p2p_v1';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowISO = () => new Date().toISOString();

type Action =
  | { type: 'ADD_CLIENT'; client: Client }
  | { type: 'UPDATE_CLIENT'; client: Client }
  | { type: 'DELETE_CLIENT'; id: string }
  | { type: 'ADD_LOAN'; loan: Loan }
  | { type: 'UPDATE_LOAN'; loan: Loan }
  | { type: 'DELETE_LOAN'; id: string }
  | { type: 'ADD_REPAYMENT'; repayment: Repayment }
  | { type: 'UPDATE_REPAYMENT'; repayment: Repayment }
  | { type: 'DELETE_REPAYMENT'; id: string }
  | { type: 'IMPORT'; data: AppData }
  | { type: 'MERGE'; data: AppData }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'RESET' }
  | { type: 'CLEAR' };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_CLIENT':
      return { ...state, clients: [action.client, ...state.clients] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map((c) => (c.id === action.client.id ? action.client : c)),
      };
    case 'DELETE_CLIENT': {
      const loanIds = state.loans.filter((l) => l.clientId === action.id).map((l) => l.id);
      return {
        ...state,
        clients: state.clients.filter((c) => c.id !== action.id),
        loans: state.loans.filter((l) => l.clientId !== action.id),
        repayments: state.repayments.filter((r) => !loanIds.includes(r.loanId)),
      };
    }
    case 'ADD_LOAN':
      return { ...state, loans: [action.loan, ...state.loans] };
    case 'UPDATE_LOAN':
      return { ...state, loans: state.loans.map((l) => (l.id === action.loan.id ? action.loan : l)) };
    case 'DELETE_LOAN':
      return {
        ...state,
        loans: state.loans.filter((l) => l.id !== action.id),
        repayments: state.repayments.filter((r) => r.loanId !== action.id),
      };
    case 'ADD_REPAYMENT':
      return { ...state, repayments: [action.repayment, ...state.repayments] };
    case 'UPDATE_REPAYMENT':
      return {
        ...state,
        repayments: state.repayments.map((r) => (r.id === action.repayment.id ? action.repayment : r)),
      };
    case 'DELETE_REPAYMENT':
      return { ...state, repayments: state.repayments.filter((r) => r.id !== action.id) };
    case 'IMPORT':
      return action.data;
    case 'MERGE':
      return {
        clients: [...action.data.clients, ...state.clients],
        loans: [...action.data.loans, ...state.loans],
        repayments: [...action.data.repayments, ...state.repayments],
        settings: state.settings,
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'RESET':
      return seedData();
    case 'CLEAR':
      return { clients: [], loans: [], repayments: [], settings: state.settings };
    default:
      return state;
  }
}

export function seedData(): AppData {
  return {
    clients: [],
    loans: [],
    repayments: [],
    settings: { currency: 'INR', lenderName: 'Bhadrik Enterprises' },
  };
}

function init(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && Array.isArray(parsed.clients) && Array.isArray(parsed.loans)) {
        return {
          clients: parsed.clients,
          loans: parsed.loans,
          repayments: parsed.repayments ?? [],
          settings: parsed.settings ?? { currency: 'INR', lenderName: 'Bhadrik Enterprises' },
        };
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return seedData();
}

interface StoreContextValue {
  data: AppData;
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  addLoan: (l: Omit<Loan, 'id' | 'createdAt'>) => Loan;
  updateLoan: (l: Loan) => void;
  deleteLoan: (id: string) => void;
  addRepayment: (r: Omit<Repayment, 'id'>) => void;
  updateRepayment: (r: Repayment) => void;
  deleteRepayment: (id: string) => void;
  importData: (data: AppData, merge?: boolean) => void;
  updateSettings: (s: Partial<Settings>) => void;
  resetData: () => void;
  clearData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage may be full or blocked */
    }
  }, [data]);

  const value = useMemo<StoreContextValue>(
    () => ({
      data,
      addClient: (c) => {
        const client: Client = { ...c, id: uid(), createdAt: nowISO() };
        dispatch({ type: 'ADD_CLIENT', client });
        return client;
      },
      updateClient: (client) => dispatch({ type: 'UPDATE_CLIENT', client }),
      deleteClient: (id) => dispatch({ type: 'DELETE_CLIENT', id }),
      addLoan: (l) => {
        const loan: Loan = { ...l, id: uid(), createdAt: nowISO() };
        dispatch({ type: 'ADD_LOAN', loan });
        return loan;
      },
      updateLoan: (loan) => dispatch({ type: 'UPDATE_LOAN', loan }),
      deleteLoan: (id) => dispatch({ type: 'DELETE_LOAN', id }),
      addRepayment: (r) => dispatch({ type: 'ADD_REPAYMENT', repayment: { ...r, id: uid() } }),
      updateRepayment: (repayment) => dispatch({ type: 'UPDATE_REPAYMENT', repayment }),
      deleteRepayment: (id) => dispatch({ type: 'DELETE_REPAYMENT', id }),
      importData: (d, merge = false) => dispatch({ type: merge ? 'MERGE' : 'IMPORT', data: d }),
      updateSettings: (settings) => dispatch({ type: 'UPDATE_SETTINGS', settings }),
      resetData: () => dispatch({ type: 'RESET' }),
      clearData: () => dispatch({ type: 'CLEAR' }),
    }),
    [data]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
