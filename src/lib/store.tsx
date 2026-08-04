import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppData, Client, Loan, Repayment, Settings } from './types';
import { supabase } from './supabase';

const STORAGE_KEY = 'lendbook_p2p_v1';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowISO = () => new Date().toISOString();

type Action =
  | { type: 'SET_DATA'; data: AppData }
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
    case 'SET_DATA':
      return action.data;
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
    /* fallback to seed */
  }
  return seedData();
}

interface StoreContextValue {
  data: AppData;
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addLoan: (l: Omit<Loan, 'id' | 'createdAt'>) => Promise<Loan>;
  updateLoan: (l: Loan) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addRepayment: (r: Omit<Repayment, 'id'>) => Promise<void>;
  updateRepayment: (r: Repayment) => Promise<void>;
  deleteRepayment: (id: string) => Promise<void>;
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
      /* ignore storage quota limits */
    }
  }, [data]);

  const syncFromCloud = async () => {
    try {
      if (!supabase) return;
      const [clientsRes, loansRes, repaymentsRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('loans').select('*'),
        supabase.from('repayments').select('*'),
      ]);

      if (clientsRes.data || loansRes.data || repaymentsRes.data) {
        const cleanClients: Client[] = (clientsRes.data || []).map((c: any) => ({
          id: c.id,
          name: c.name ?? 'Unknown',
          phone: c.phone ?? '',
          email: c.email ?? '',
          address: c.address ?? '',
          notes: c.notes ?? '',
          createdAt: c.createdAt ?? c.createdat ?? nowISO(),
        }));

        const cleanLoans: Loan[] = (loansRes.data || []).map((l: any) => ({
          id: l.id,
          clientId: l.clientid ?? l.clientId ?? l.client_id ?? '',
          amount: Number(l.amount ?? l.principal ?? 0),
          principal: Number(l.principal ?? l.amount ?? 0),
          interestRate: Number(l.interestRate ?? l.interestrate ?? 0),
          upfrontDeduction: Number(l.upfrontDeduction ?? l.upfront_deduction ?? 0),
          startDate: l.startDate ?? l.startdate ?? nowISO(),
          dueDate: l.dueDate ?? l.duedate ?? '',
          tenureMonths: Number(l.tenureMonths ?? l.tenure ?? 0),
          interestType: l.loanType ?? l.loantype ?? l.interestType ?? l.interest_type ?? 'interest_only',
          purpose: l.purpose ?? l.notes ?? 'Personal',
          notes: l.notes ?? '',
          createdAt: l.createdAt ?? l.createdat ?? nowISO(),
        }));

        const cleanRepayments: Repayment[] = (repaymentsRes.data || []).map((r: any) => ({
          id: r.id,
          loanId: r.loanid ?? r.loanId ?? '',
          amount: Number(r.amount ?? 0),
          date: r.date ?? nowISO(),
          method: r.method ?? 'Cash',
          notes: r.notes ?? '',
        }));

        dispatch({
          type: 'SET_DATA',
          data: {
            clients: cleanClients,
            loans: cleanLoans,
            repayments: cleanRepayments,
            settings: data.settings,
          },
        });
      }
    } catch (e) {
      console.warn('Could not sync with Supabase cloud:', e);
    }
  };

  useEffect(() => {
    syncFromCloud();
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      data,
      addClient: async (c) => {
        const client: Client = { ...c, id: uid(), createdAt: nowISO() };
        dispatch({ type: 'ADD_CLIENT', client });
        if (supabase) {
          const { error } = await supabase.from('clients').insert([client]);
          if (error) console.error('Error saving client:', error);
        }
        return client;
      },
      updateClient: async (client) => {
        dispatch({ type: 'UPDATE_CLIENT', client });
        if (supabase) {
          const { error } = await supabase.from('clients').update(client).eq('id', client.id);
          if (error) console.error('Error updating client:', error);
        }
      },
      deleteClient: async (id) => {
        dispatch({ type: 'DELETE_CLIENT', id });
        if (supabase) {
          const { error } = await supabase.from('clients').delete().eq('id', id);
          if (error) console.error('Error deleting client:', error);
        }
      },
      addLoan: async (l: any) => {
        const resolvedClientId = l.clientId || l.clientid || l.client_id || l.borrowerId || '';
        const loan: Loan = { ...l, clientId: resolvedClientId, id: uid(), createdAt: nowISO() };
        
        dispatch({ type: 'ADD_LOAN', loan });

        if (supabase) {
          const payload = {
            id: loan.id,
            clientid: resolvedClientId,
            amount: Number(loan.amount || loan.principal || 0),
            interestRate: Number(loan.interestRate || 0),
            startDate: loan.startDate || nowISO(),
            dueDate: loan.dueDate || null,
            loanType: loan.interestType || 'interest_only',
            tenure: Number(loan.tenureMonths || 0),
            notes: loan.purpose || loan.notes || '',
            createdAt: loan.createdAt,
          };

          const { error } = await supabase.from('loans').insert([payload]);
          if (error) {
            console.error('Error saving loan to cloud:', error.message);
          }
        }
        return loan;
      },
      updateLoan: async (loan: any) => {
        const resolvedClientId = loan.clientId || loan.clientid || loan.client_id || '';
        dispatch({ type: 'UPDATE_LOAN', loan });
        if (supabase) {
          const payload = {
            id: loan.id,
            clientid: resolvedClientId,
            amount: Number(loan.amount || loan.principal || 0),
            interestRate: Number(loan.interestRate || 0),
            startDate: loan.startDate || nowISO(),
            dueDate: loan.dueDate || null,
            loanType: loan.interestType || 'interest_only',
            tenure: Number(loan.tenureMonths || 0),
            notes: loan.purpose || loan.notes || '',
          };
          const { error } = await supabase.from('loans').update(payload).eq('id', loan.id);
          if (error) console.error('Error updating loan:', error);
        }
      },
      deleteLoan: async (id) => {
        dispatch({ type: 'DELETE_LOAN', id });
        if (supabase) {
          const { error } = await supabase.from('loans').delete().eq('id', id);
          if (error) console.error('Error deleting loan:', error);
        }
      },
      addRepayment: async (r) => {
        const repayment: Repayment = { ...r, id: uid() };
        dispatch({ type: 'ADD_REPAYMENT', repayment });
        if (supabase) {
          const payload = {
            id: repayment.id,
            loanid: repayment.loanId,
            amount: repayment.amount,
            date: repayment.date,
            method: repayment.method,
            notes: repayment.notes,
          };
          const { error } = await supabase.from('repayments').insert([payload]);
          if (error) console.error('Error saving repayment:', error);
        }
      },
      updateRepayment: async (repayment) => {
        dispatch({ type: 'UPDATE_REPAYMENT', repayment });
        if (supabase) {
          const payload = {
            id: repayment.id,
            loanid: repayment.loanId,
            amount: repayment.amount,
            date: repayment.date,
            method: repayment.method,
            notes: repayment.notes,
          };
          const { error } = await supabase.from('repayments').update(payload).eq('id', repayment.id);
          if (error) console.error('Error updating repayment:', error);
        }
      },
      deleteRepayment: async (id) => {
        dispatch({ type: 'DELETE_REPAYMENT', id });
        if (supabase) {
          const { error } = await supabase.from('repayments').delete().eq('id', id);
          if (error) console.error('Error deleting repayment:', error);
        }
      },
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
