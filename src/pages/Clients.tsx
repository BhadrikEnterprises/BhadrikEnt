import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Pencil, Trash2, Landmark, Mail, Phone, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { computeClientStats } from '../lib/finance';
import { formatCurrency } from '../lib/format';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ClientForm } from '../components/forms';
import { Button, Card, Input, Avatar, Badge, EmptyState } from '../components/ui';
import type { Client } from '../lib/types';

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
                        {formatCurrency(weeklyDueVal, currency, { compact: true })}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-blue-600 tabular">
                        {formatCurrency(monthlyDueVal, currency, { compact: true })}
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
