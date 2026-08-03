import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye, HandCoins, Landmark, Filter } from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { computeLoanStats } from '../lib/finance';
import { formatCurrency, formatDate, relativeDays } from '../lib/format';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoanForm } from '../components/forms';
import { LoanDetailModal } from '../components/LoanDetailModal';
import { Button, Card, Input, Select, Avatar, ProgressBar, StatusPill, Badge, EmptyState, cn } from '../components/ui';
import type { Loan, InterestType } from '../lib/types';

const TYPE_LABEL: Record<InterestType, string> = {
  emi: 'EMI',
  interest_only: 'Int-only',
  lumpsum: 'Lumpsum',
};

type StatusFilter = 'all' | 'active' | 'overdue' | 'closed';

export function Loans() {
  const { data, addLoan, updateLoan, deleteLoan } = useStore();
  const { notify } = useToast();
  const currency = data.settings.currency;
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [toDelete, setToDelete] = useState<Loan | null>(null);

  const clientFilter = params.get('client') ?? 'all';

  const setClientFilter = (v: string) => {
    const next = new URLSearchParams(params);
    if (v === 'all') next.delete('client');
    else next.set('client', v);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.loans
      .map((l) => {
        const stats = computeLoanStats(l, data.repayments);
        const client = data.clients.find((c) => c.id === l.clientId);
        return { loan: l, client, stats };
      })
      .filter((x) => {
        if (clientFilter !== 'all' && x.loan.clientId !== clientFilter) return false;
        if (statusFilter !== 'all' && x.stats.status !== statusFilter) return false;
        if (q) {
          const hay = `${x.client?.name ?? ''} ${x.loan.purpose}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.stats.outstanding - a.stats.outstanding);
  }, [data, query, statusFilter, clientFilter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, x) => {
        acc.outstanding += x.stats.outstanding;
        acc.overdue += x.stats.arrears;
        if (x.stats.isOverdue) acc.overdueCount++;
        if (x.stats.status === 'active') acc.activeCount++;
        return acc;
      },
      { outstanding: 0, overdue: 0, overdueCount: 0, activeCount: 0 }
    );
  }, [rows]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (l: Loan) => {
    setEditing(l);
    setDetailLoan(null);
    setModalOpen(true);
  };

  const handleSubmit = (v: Omit<Loan, 'id' | 'createdAt'>) => {
    if (editing) {
      updateLoan({ ...editing, ...v });
      notify('Loan updated');
    } else {
      addLoan(v);
      notify('Loan created');
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search borrower or purpose..." className="pl-9" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="sm:w-40">
            <option value="all">All status</option>
            <option value="active">On track</option>
            <option value="overdue">Overdue</option>
            <option value="closed">Closed</option>
          </Select>
          <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="sm:w-44">
            <option value="all">All clients</option>
            {data.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add Loan
        </Button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2.5">
        <Chip icon={<Landmark size={13} />} label={`${rows.length} loans`} />
        <Chip icon={<HandCoins size={13} />} label={`${formatCurrency(totals.outstanding, currency, { compact: true })} outstanding`} tone="amber" />
        {totals.overdueCount > 0 && <Chip icon={<Filter size={13} />} label={`${totals.overdueCount} overdue · ${formatCurrency(totals.overdue, currency, { compact: true })}`} tone="rose" />}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={data.loans.length === 0 ? 'No loans yet' : 'No loans match your filters'}
            description={data.loans.length === 0 ? 'Create your first loan to start tracking repayments.' : 'Try adjusting the search or filters.'}
            action={
              data.loans.length === 0 && (
                <Button onClick={openAdd}>
                  <Plus size={16} /> Add Loan
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Borrower / Purpose</th>
                  <th className="px-5 py-3 text-right font-semibold">Principal</th>
                  <th className="hidden px-5 py-3 text-center font-semibold md:table-cell">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Progress</th>
                  <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                  <th className="hidden px-5 py-3 text-center font-semibold sm:table-cell">Next Due</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ loan, client, stats }) => (
                  <tr
                    key={loan.id}
                    onClick={() => setDetailLoan(loan)}
                    className="group cursor-pointer transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {client && <Avatar name={client.name} className="h-9 w-9" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{client?.name ?? 'Unknown'}</p>
                          <p className="truncate text-xs text-slate-400">{loan.purpose || 'Loan'} · {loan.interestRate}% · {loan.tenureMonths}mo</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700 tabular">{formatCurrency(loan.principal, currency, { compact: true })}</td>
                    <td className="hidden px-5 py-3.5 text-center md:table-cell">
                      <Badge tone="slate">{TYPE_LABEL[loan.interestType]}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-28">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span className="tabular">{stats.paidInstallments}/{stats.totalInstallments}</span>
                          <span className="tabular">{stats.progress.toFixed(0)}%</span>
                        </div>
                        <ProgressBar value={stats.progress} tone={stats.isOverdue ? 'rose' : 'emerald'} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={cn('font-semibold tabular', stats.outstanding === 0 ? 'text-emerald-600' : 'text-slate-900')}>{formatCurrency(stats.outstanding, currency, { compact: true })}</span>
                    </td>
                    <td className="hidden px-5 py-3.5 text-center sm:table-cell">
                      {stats.nextDueDate ? (
                        <div className="text-xs">
                          <p className="font-medium text-slate-600">{formatDate(stats.nextDueDate, 'dd MMM')}</p>
                          <p className="text-slate-400">{relativeDays(stats.nextDueDate)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600">Settled</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusPill status={stats.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setDetailLoan(loan)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="View details">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => openEdit(loan)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(loan)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={editing ? 'Edit Loan' : 'Add Loan'}
        subtitle={editing ? 'Update loan terms' : 'Lend to a borrower'}
      >
        <LoanForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitLabel={editing ? 'Save Changes' : 'Create Loan'} />
      </Modal>

      <LoanDetailModal loan={detailLoan} open={!!detailLoan} onClose={() => setDetailLoan(null)} onEdit={openEdit} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this loan?"
        message="This removes the loan and all its recorded repayments. This cannot be undone."
        confirmLabel="Delete loan"
        danger
        onConfirm={() => {
          if (toDelete) {
            deleteLoan(toDelete.id);
            notify('Loan deleted');
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function Chip({ icon, label, tone = 'slate' }: { icon: React.ReactNode; label: string; tone?: 'slate' | 'amber' | 'rose' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', tones[tone])}>
      {icon}
      {label}
    </span>
  );
}
