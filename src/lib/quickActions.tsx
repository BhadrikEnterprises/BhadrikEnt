import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal } from '../components/Modal';
import { RepaymentForm } from '../components/forms';
import { useStore } from './store';
import { useToast } from './toast';
import type { Repayment } from './types';

interface QuickActionsValue {
  recordRepayment: (loanId?: string) => void;
}

const QuickActionsContext = createContext<QuickActionsValue>({ recordRepayment: () => {} });

export function useQuickActions(): QuickActionsValue {
  return useContext(QuickActionsContext);
}

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const { addRepayment } = useStore();
  const { notify } = useToast();
  const [state, setState] = useState<{ open: boolean; loanId?: string }>({ open: false });

  const value = useMemo<QuickActionsValue>(
    () => ({
      recordRepayment: (loanId?: string) => setState({ open: true, loanId }),
    }),
    []
  );

  const handleSubmit = (v: Omit<Repayment, 'id'>) => {
    addRepayment(v);
    setState({ open: false });
    notify('Repayment recorded successfully');
  };

  return (
    <QuickActionsContext.Provider value={value}>
      {children}
      <Modal
        open={state.open}
        onClose={() => setState({ open: false })}
        title="Record Repayment"
        subtitle="Log an incoming repayment from a borrower"
      >
        <RepaymentForm
          presetLoanId={state.loanId}
          onSubmit={handleSubmit}
          onCancel={() => setState({ open: false })}
        />
      </Modal>
    </QuickActionsContext.Provider>
  );
}
