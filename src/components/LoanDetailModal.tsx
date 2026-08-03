import { useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarClock,
  IndianRupee,
  Percent,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button, Badge, ProgressBar, StatusPill, Avatar } from './ui';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { useQuickActions } from '../lib/quickActions';
import { computeLoanStats } from '../lib/finance';
import { formatCurrency, formatDate, relativeDays } from '../lib/format';
import type { Loan } from '../lib/types';
import { ConfirmDialog } from './ConfirmDialog';

const TYPE_LABEL: Record<string, string> = {
  emi: 'EMI · Reducing',
  interest_only: 'Interest-only',
  lumpsum: 'Lumpsum',
};

export function LoanDetailModal({
  loan,
  open,
  onClose,
  onEdit,
}: {
  loan: Loan | null;
  open: boolean;
  onClose: () => void;
  onEdit: (loan: Loan) => void;
}) {
  const { data, deleteLoan, deleteRepayment } = useStore();
  const { notify } = useToast();
  const { recordRepayment } = useQuickActions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRepay, setConfirmRepay] = useState<string | null>(null);

  if (!loan) return null;

  const stats = computeLoanStats(loan, data.repayments);
  const client = data.clients.find((c) => c.id === loan.clientId);
  const repayments = data.repayments
    .filter((r) => r.loanId === loan.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const today = new Date();

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        title={
          <span className="flex items-center gap-2.5">
            {client && <Avatar name={client.name} className="h-8 w-8" />}
            {client?.name ?? 'Unknown client'}
          </span>
        }
        subtitle={`${loan.purpose || 'Loan'} · started ${formatDate(loan.startDate)}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => onEdit(loan)}>
              <Pencil size={15} /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-rose-600 hover:bg-rose-50">
              <Trash2 size={15} /> Delete
            </Button>
            <Button size="sm" onClick={() => recordRepayment(loan.id)} className="ml-auto">
              <Plus size={15} /> Record Repayment
            </Button>
          </>
        }
      >
        {/* Summary */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <StatusPill status={stats.status} />
          <Badge tone="sky">{TYPE_LABEL[loan.interestType]}</Badge>
          <Badge tone="slate">{loan.tenureMonths} months</Badge>
          {stats.isOverdue && <Badge tone="rose">{formatCurrency(stats.arrears, data.settings.currency)} overdue</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryItem icon={<IndianRupee size={14} />} label="Principal" value={formatCurrency(loan.principal, data.settings.currency, { compact: true })} />
          <SummaryItem icon={<Percent size={14} />} label="Rate" value={`${loan.interestRate}% p.a.`} />
          <SummaryItem icon={<CalendarClock size={14} />} label="Maturity" value={formatDate(stats.maturityDate, 'MMM yyyy')} />
          <SummaryItem icon={<CheckCircle2 size={14} />} label="Collected" value={formatCurrency(stats.received, data.settings.currency, { compact: true })} />
        </div>

        {/* Progress */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Repayment progress</span>
            <span className="font-semibold text-slate-900 tabular">
              {stats.paidInstallments}/{stats.totalInstallments} installments · {stats.progress.toFixed(0)}%
            </span>
          </div>
          <ProgressBar value={stats.progress} tone={stats.isOverdue ? 'rose' : 'emerald'} />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-500">
              Outstanding:{' '}
              <span className="font-semibold text-slate-900 tabular">{formatCurrency(stats.outstanding, data.settings.currency)}</span>
            </span>
            {stats.nextDueDate ? (
              <span className="text-slate-500">
                Next due:{' '}
                <span className="font-semibold text-slate-900">{formatCurrency(stats.nextDueAmount, data.settings.currency, { compact: true })}</span>{' '}
                <span className="text-slate-400">· {relativeDays(stats.nextDueDate)}</span>
              </span>
            ) : (
              <span className="font-medium text-emerald-600">Fully collected</span>
            )}
          </div>
        </div>

        {/* Schedule */}
        <h4 className="mt-6 mb-2.5 text-sm font-semibold text-slate-700">Repayment Schedule</h4>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Due Date</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Interest</th>
                  <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Balance</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.schedule.map((s, i) => {
                  const isPaid = i < stats.paidInstallments;
                  const isOverdue = !isPaid && new Date(s.dueDate) <= today;
                  return (
                    <tr key={s.installment} className={isPaid ? 'bg-emerald-50/30' : isOverdue ? 'bg-rose-50/30' : ''}>
                      <td className="px-3 py-2.5 text-slate-500">{s.installment}</td>
                      <td className="px-3 py-2.5 text-slate-700">{formatDate(s.dueDate, 'dd MMM yy')}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800 tabular">{formatCurrency(s.amount, data.settings.currency)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 tabular">{formatCurrency(s.interest, data.settings.currency)}</td>
                      <td className="hidden px-3 py-2.5 text-right text-slate-500 tabular sm:table-cell">{formatCurrency(s.balance, data.settings.currency)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle2 size={13} /> Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                            <AlertCircle size={13} /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock size={13} /> Due
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repayments recorded */}
        <div className="mt-6 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Recorded Repayments ({repayments.length})</h4>
        </div>
        {repayments.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">No repayments recorded yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {repayments.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <IndianRupee size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 tabular">{formatCurrency(r.amount, data.settings.currency)}</p>
                  <p className="truncate text-xs text-slate-400">
                    {formatDate(r.date)} · {r.method}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setConfirmRepay(r.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this loan?"
        message="This permanently removes the loan and all its recorded repayments. This cannot be undone."
        confirmLabel="Delete loan"
        danger
        onConfirm={() => {
          deleteLoan(loan.id);
          notify('Loan deleted');
          onClose();
        }}
        onClose={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={!!confirmRepay}
        title="Delete repayment?"
        message="This repayment record will be removed and the outstanding balance recalculated."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmRepay) {
            deleteRepayment(confirmRepay);
            notify('Repayment removed');
          }
        }}
        onClose={() => setConfirmRepay(null)}
      />
    </>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="font-display text-base font-bold text-slate-900 tabular">{value}</p>
    </div>
  );
}
