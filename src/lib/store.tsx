import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { addMonths, parseISO, subMonths } from 'date-fns';
import type { AppData, Client, Loan, Repayment, Settings } from './types';
import { generateSchedule } from './finance';

const STORAGE_KEY = 'lendbook_p2p_v1';

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowISO = () => new Date().toISOString();
const ago = (m: number) => subMonths(new Date(), m).toISOString();

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
  const clients: Client[] = [
    { id: 'c1', name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', phone: '+91 98200 11234', notes: 'Salaried, IT professional', createdAt: ago(14) },
    { id: 'c2', name: 'Priya Patel', email: 'priya.patel@gmail.com', phone: '+91 90040 55678', notes: 'Small business owner', createdAt: ago(8) },
    { id: 'c3', name: 'Amit Kumar', email: 'amit.kumar@gmail.com', phone: '+91 99870 33921', notes: 'Restaurant owner', createdAt: ago(6) },
    { id: 'c4', name: 'Sneha Reddy', email: 'sneha.reddy@gmail.com', phone: '+91 91234 56780', notes: 'Freelance designer', createdAt: ago(14) },
    { id: 'c5', name: 'Vikram Singh', email: 'vikram.singh@gmail.com', phone: '+91 98110 22345', notes: 'Real estate agent', createdAt: ago(22) },
    { id: 'c6', name: 'Anjali Gupta', email: 'anjali.gupta@gmail.com', phone: '+91 99001 23456', notes: 'Tutor', createdAt: ago(8) },
    { id: 'c7', name: 'Rohit Verma', email: 'rohit.verma@gmail.com', phone: '+91 90011 99887', notes: 'Trader', createdAt: ago(10) },
    { id: 'c8', name: 'Meera Nair', email: 'meera.nair@gmail.com', phone: '+91 98470 11223', notes: 'Consultant', createdAt: ago(3) },
    { id: 'c9', name: 'Karan Mehta', email: 'karan.mehta@gmail.com', phone: '+91 91500 67123', notes: 'Auto workshop', createdAt: ago(5) },
  ];

  const loans: Loan[] = [
    { id: 'l1', clientId: 'c1', principal: 200000, interestRate: 14, startDate: ago(14), tenureMonths: 24, interestType: 'emi', purpose: 'Home renovation', createdAt: ago(14) },
    { id: 'l2', clientId: 'c2', principal: 150000, interestRate: 12, startDate: ago(8), tenureMonths: 18, interestType: 'interest_only', purpose: 'Working capital', createdAt: ago(8) },
    { id: 'l3', clientId: 'c3', principal: 500000, interestRate: 16, startDate: ago(6), tenureMonths: 36, interestType: 'emi', purpose: 'Restaurant expansion', createdAt: ago(6) },
    { id: 'l4', clientId: 'c4', principal: 75000, interestRate: 18, startDate: ago(14), tenureMonths: 12, interestType: 'lumpsum', purpose: 'Equipment purchase', createdAt: ago(14) },
    { id: 'l5', clientId: 'c5', principal: 300000, interestRate: 15, startDate: ago(22), tenureMonths: 24, interestType: 'emi', purpose: 'Property deal', createdAt: ago(22) },
    { id: 'l6', clientId: 'c6', principal: 100000, interestRate: 20, startDate: ago(8), tenureMonths: 6, interestType: 'lumpsum', purpose: 'Course fees', createdAt: ago(8) },
    { id: 'l7', clientId: 'c7', principal: 250000, interestRate: 13, startDate: ago(10), tenureMonths: 24, interestType: 'interest_only', purpose: 'Inventory', createdAt: ago(10) },
    { id: 'l8', clientId: 'c8', principal: 400000, interestRate: 14, startDate: ago(3), tenureMonths: 30, interestType: 'emi', purpose: 'Business setup', createdAt: ago(3) },
    { id: 'l9', clientId: 'c9', principal: 180000, interestRate: 17, startDate: ago(5), tenureMonths: 18, interestType: 'emi', purpose: 'Workshop tools', createdAt: ago(5) },
    { id: 'l10', clientId: 'c1', principal: 120000, interestRate: 15, startDate: ago(2), tenureMonths: 12, interestType: 'emi', purpose: 'Two-wheeler', createdAt: ago(2) },
  ];

  const repayments: Repayment[] = [];
  const methods = ['UPI', 'Bank Transfer', 'Cash'];
  const today = new Date();
  const partial: Record<string, number> = { l4: 20000, l6: 40000 };

  let ri = 1;
  for (const loan of loans) {
    if (partial[loan.id] !== undefined) {
      repayments.push({
        id: 'r' + ri++,
        loanId: loan.id,
        date: addMonths(parseISO(loan.startDate), 1).toISOString(),
        amount: partial[loan.id],
        method: 'Cash',
        notes: 'Partial repayment',
      });
      continue;
    }
    const sched = generateSchedule(loan);
    for (const s of sched) {
      if (parseISO(s.dueDate) <= today) {
        repayments.push({
          id: 'r' + ri++,
          loanId: loan.id,
          date: s.dueDate,
          amount: s.amount,
          method: methods[s.installment % methods.length],
          notes: `Installment ${s.installment}/${sched.length}`,
        });
      }
    }
  }

  const settings: Settings = { currency: 'INR', lenderName: 'My Lending Book' };
  return { clients, loans, repayments, settings };
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
          settings: parsed.settings ?? { currency: 'INR', lenderName: 'My Lending Book' },
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
