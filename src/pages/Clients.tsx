import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Pencil, Trash2, Landmark, Mail, Phone, Users, Info, Calendar } from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { computeClientStats, computeLoanStats } from '../lib/finance';
import { formatCurrency, formatDate, formatLoanType } from '../lib/format';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ClientForm } from '../components/forms';
import { Button, Card, Input, Avatar, Badge, EmptyState } from '../components/ui';
import type { Client, Loan } from '../lib/types';
import { startOfWeek, endOfWeek, addWeeks, startOfMonth, addMonths, parseISO } from 'date-fns';

interface BreakdownItem {
  loan: Loan;
  installment: number;
  dueDate: string;
  amount: number;
}

export function Clients() {
  const { data, addClient, updateClient, deleteClient } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const currency = data.settings.currency;
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const [weeklyPeriod, setWeeklyPeriod] = useState<'this_week' | 'next_week'>('this_week');
  const [monthlyPeriod, setMonthlyPeriod] = useState<'this_month' | 'next_month'>('this_month');

  // Breakdown Modal state
  const [breakdownData, setBreakdownData] = useState<{
    clientName: string;
    title: string;
    items: BreakdownItem[];
  } | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q))
      .map((c) => ({ client: c, stats: computeClientStats(c.id, data) }))
      .sort((a, b) => b.stats.outstanding - a.stats.outstanding);
  }, [data, query]);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleSubmit = (v: Omit<Client, 'id' | 'createdAt'>) => {
    if (editing) {
      updateClient({ ...editing, ...v });
      notify('Client updated');
    } else {
      addClient(v);
      notify('Client added');
    }
    setModalOpen(false);
  };

  // Helper to open the dues breakdown modal
  const showDueBreakdown = (
    client: Client,
    periodType: 'weekly' | 'monthly',
    periodKey: 'this_week' | 'next_week' | 'this_month' | 'next_month'
  ) => {
    const today = new Date();
    const loans = data.loans.filter((l) => l.clientId === client.id);
    const items: BreakdownItem[] = [];

    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(thisWeekStart, 1);
    const nextWeekEnd = addWeeks(thisWeekEnd, 1);

    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    const nextMonthStart = startOfMonth(addMonths(today, 1));
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59);

    let startRange: Date, endRange: Date, label: string;

    if (periodKey === 'this_week') {
      startRange = thisWeekStart;
      endRange = thisWeekEnd;
      label = 'Due This Week';
    } else if (periodKey === 'next_week') {
      startRange = nextWeekStart;
      endRange = nextWeekEnd;
      label = 'Due Next Week';
    } else if (periodKey === 'this_month') {
      startRange = thisMonthStart;
      endRange = thisMonthEnd;
      label = 'Due This Month';
    } else {
      startRange = nextMonthStart;
      endRange = nextMonthEnd;
      label = 'Due Next Month';
    }

    for (const l of loans) {
      const st = computeLoanStats(l, data.repayments, today);
      if (st.isClosed) continue;

      const loanPayments = data.repayments
        .filter((r) => r.loanId === l.id)
        .reduce((s, r) => s + r.amount, 0);

      let cum = 0;
      for (const row of st.schedule) {
        cum += row.amount;
        if (loanPayments >= cum) continue; // paid

        const d = parseISO(row.dueDate);
        if (d >= startRange && d <= endRange) {
          items.push({
            loan: l,
            installment: row.installment,
            dueDate: row.dueDate,
            amount: row.amount,
          });
        }
      }
    }

    setBreakdownData({
      clientName: client.name,
      title: label,
      items,
    });
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients..." className="pl-9" />
        </div>
        <Button onClick={openAdd}>
          <UserPlus size={16} /> Add Client
        </Button>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? 'No matching clients' : 'No clients yet'}
            description={query ? 'Try a different search term.' : 'Add your first borrower to start tracking loans and repayments.'}
            action={
              !query && (
                <Button onClick={openAdd}>
                  <UserPlus size={16} /> Add your first client
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Client</th>
                  <th className="px-5 py-3 text-left font-semibold">Contact</th>
                  <th className="px-5 py-3 text-center font-semibold">Loans</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <div className="flex items-center justify-end gap-1.5">
                      <select
                        value={weeklyPeriod}
                        onChange={(e) => setWeeklyPeriod(e.target.value as any)}
                        className="rounded border-slate-200 bg-transparent text-xs font-semibold uppercase text-amber-700 focus:ring-amber-500"
                      >
                        <option value="this_week">Due This Week</option>
                        <option value="next_week">Due Next Week</option>
                      </select>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <div className="flex items-center justify-end gap-1.5">
                      <select
                        value={monthlyPeriod}
                        onChange={(e) => setMonthlyPeriod(e.target.value as any)}
                        className="rounded border-slate-200 bg-transparent text-xs font-semibold uppercase text-blue-700 focus:ring-blue-500"
                      >
                        <option value="this_month">Due This Month</option>
                        <option value="next_month">Due Next Month</option>
                      </select>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">Total Lent</th>
                  <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ client, stats }) => {
                  const weeklyDueVal = weeklyPeriod === 'this_week' ? stats.dueThisWeek : stats.dueNextWeek;
                  const monthlyDueVal = monthlyPeriod === 'this_month' ? stats.dueThisMonth : stats.dueNextMonth;

                  return (
                    <tr key={client.id} className="group transition hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} className="h-10 w-10" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{client.name}</p>
                            {client.notes && <p className="truncate text-xs text-slate-400">{client.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5 text-xs text-slate-500">
                          {client.email && (
                            <p className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {client.email}</p>
                          )}
                          {client.phone && (
                            <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {client.phone}</p>
                          )}
                          {!client.email && !client.phone && <p className="text-slate-300">—</p>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {stats.loanCount > 0 ? (
                          <button
                            onClick={() => navigate(`/loans?client=${client.id}`)}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700"
                          >
                            <Landmark size={12} /> {stats.loanCount}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-amber-600 tabular">
                        {weeklyDueVal > 0 ? (
                          <button
                            onClick={() => showDueBreakdown(client, 'weekly', weeklyPeriod)}
                            className="group/btn inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-amber-50 hover:underline"
                            title="Click for breakdown"
                          >
                            {formatCurrency(weeklyDueVal, currency, { compact: true })}
                            <Info size={12} className="opacity-0 transition group-hover/btn:opacity-100" />
                          </button>
                        ) : (
                          formatCurrency(0, currency, { compact: true })
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-blue-600 tabular">
                        {monthlyDueVal > 0 ? (
                          <button
                            onClick={() => showDueBreakdown(client, 'monthly', monthlyPeriod)}
                            className="group/btn inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-blue-50 hover:underline"
                            title="Click for breakdown"
                          >
                            {formatCurrency(monthlyDueVal, currency, { compact: true })}
                            <Info size={12} className="opacity-0 transition group-hover/btn:opacity-100" />
                          </button>
                        ) : (
                          formatCurrency(0, currency, { compact: true })
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-700 tabular">{formatCurrency(stats.totalLent, currency, { compact: true })}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold text-slate-900 tabular">{formatCurrency(stats.outstanding, currency, { compact: true })}</span>
                          {stats.overdue > 0 && <Badge tone="rose">{formatCurrency(stats.overdue, currency, { compact: true })} late</Badge>}
                          {stats.outstanding === 0 && stats.loanCount > 0 && <span className="text-xs text-emerald-600">Settled</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(client)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Edit">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setToDelete(client)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dues Breakdown Modal */}
      <Modal
        open={!!breakdownData}
        onClose={() => setBreakdownData(null)}
        title={`${breakdownData?.clientName} — ${breakdownData?.title}`}
        subtitle="Individual installment items contributing to this total"
      >
        <div className="space-y-4 pt-1">
          {breakdownData?.items.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">No upcoming installments in this timeframe.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Loan Type</th>
                    <th className="px-4 py-2.5 text-center">Installment</th>
                    <th className="px-4 py-2.5 text-left">Due Date</th>
                    <th className="px-4 py-2.5 text-right">Amount Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {breakdownData?.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {formatCurrency(item.loan.principal, currency, { compact: true })}
                        </span>
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {formatLoanType(item.loan.interestType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-slate-500">
                        #{item.installment}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {formatDate(item.dueDate, 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular">
                        {formatCurrency(item.amount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right text-xs uppercase text-slate-500">
                      Total Due:
                    </td>
                    <td className="px-4 py-2.5 text-right text-indigo-700 tabular">
                      {formatCurrency(
                        breakdownData?.items.reduce((s, i) => s + i.amount, 0) ?? 0,
                        currency
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setBreakdownData(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Client' : 'Add Client'}
        subtitle={editing ? 'Update borrower details' : 'Create a new borrower profile'}
      >
        <ClientForm initial={editing ?? undefined} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitLabel={editing ? 'Save Changes' : 'Add Client'} />
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete ${toDelete?.name}?`}
        message="This removes the client along with all their loans and recorded repayments. This cannot be undone."
        confirmLabel="Delete client"
        danger
        onConfirm={() => {
          if (toDelete) {
            deleteClient(toDelete.id);
            notify('Client deleted');
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
