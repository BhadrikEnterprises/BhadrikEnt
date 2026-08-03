import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, HandCoins, IndianRupee, CalendarDays, TrendingUp } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { formatCurrency, formatDate } from '../lib/format';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RepaymentForm } from '../components/forms';
import { Button, Card, Input, Avatar, Badge, EmptyState, cn } from '../components/ui';
import type { Repayment } from '../lib/types';

export function Repayments() {
  const { data, addRepayment, updateRepayment, deleteRepayment } = useStore();
  const { notify } = useToast();
  const currency = data.settings.currency;
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Repayment | null>(null);
  const [toDelete, setToDelete] = useState<Repayment | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.repayments]
      .map((r) => {
        const loan = data.loans.find((l) => l.id === r.loanId);
        const client = data.clients.find((c) => c.id === loan?.clientId);
        return { repayment: r, loan, client };
      })
      .filter((x) => !q || (x.client?.name ?? '').toLowerCase().includes(q) || (x.loan?.purpose ?? '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.repayment.date).getTime() - new Date(a.repayment.date).getTime());
  }, [data, query]);

  const summary = useMemo(() => {
    const now = new Date();
    const total = data.repayments.reduce((s, r) => s + r.amount, 0);
    const month = data.repayments.filter((r) => isSameMonth(parseISO(r.date), now)).reduce((s, r) => s + r.amount, 0);
    const monthCount = data.repayments.filter((r) => isSameMonth(parseISO(r.date), now)).length;
    return { total, month, count: data.repayments.length, monthCount };
  }, [data]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (r: Repayment) => {
    setEditing(r);
    setModalOpen(true);
  };

  const handleSubmit = (v: Omit<Repayment, 'id'>) => {
    if (editing) {
      updateRepayment({ ...editing, ...v });
      notify('Repayment updated');
    } else {
      addRepayment(v);
      notify('Repayment recorded');
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={<IndianRupee size={16} />} label="Total Collected" value={formatCurrency(summary.total, currency, { compact: true })} tone="emerald" />
        <SummaryCard icon={<CalendarDays size={16} />} label="This Month" value={formatCurrency(summary.month, currency, { compact: true })} tone="sky" />
        <SummaryCard icon={<HandCoins size={16} />} label="This Month Count" value={String(summary.monthCount)} tone="violet" />
        <SummaryCard icon={<TrendingUp size={16} />} label="Total Repayments" value={String(summary.count)} tone="slate" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search borrower or purpose..." className="pl-9" />
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} /> Record Repayment
        </Button>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={data.repayments.length === 0 ? 'No repayments yet' : 'No matching repayments'}
            description={data.repayments.length === 0 ? 'Record your first repayment to see it tracked here.' : 'Try a different search term.'}
            action={
              data.repayments.length === 0 && (
                <Button onClick={openAdd}>
                  <Plus size={16} /> Record Repayment
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Borrower</th>
                  <th className="hidden px-5 py-3 text-left font-semibold md:table-cell">Loan</th>
                  <th className="px-5 py-3 text-left font-semibold">Method</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ repayment, loan, client }) => (
                  <tr key={repayment.id} className="group transition hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="font-medium text-slate-700">{formatDate(repayment.date, 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {client && <Avatar name={client.name} className="h-8 w-8" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-700">{client?.name ?? 'Unknown'}</p>
                          {repayment.notes && <p className="truncate text-xs text-slate-400">{repayment.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <span className="text-slate-500">{loan?.purpose || 'Loan'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone="slate">{repayment.method}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <span className="font-semibold text-emerald-600 tabular">+{formatCurrency(repayment.amount, currency)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(repayment)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setToDelete(repayment)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
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
        title={editing ? 'Edit Repayment' : 'Record Repayment'}
        subtitle={editing ? 'Update repayment details' : 'Log an incoming repayment'}
      >
        <RepaymentForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitLabel={editing ? 'Save Changes' : 'Record Repayment'} />
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete repayment?"
        message="This repayment record will be removed and the outstanding balance recalculated."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (toDelete) {
            deleteRepayment(toDelete.id);
            notify('Repayment removed');
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'emerald' | 'sky' | 'violet' | 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-display text-lg font-bold text-slate-900 tabular">{value}</p>
      </div>
    </Card>
  );
}
