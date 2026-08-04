import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Landmark,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { computeLoanStats, LoanStatus } from '../lib/finance';
import { formatCurrency, formatDate, relativeDays, formatLoanType } from '../lib/format';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoanForm, RepaymentForm } from '../components/forms';
import { ScheduleModal } from '../components';
import { Button, Card, Input, Badge, EmptyState } from '../components/ui';
import type { Loan } from '../lib/types';

export function Loans() {
  const { data, addLoan, updateLoan, deleteLoan, addRepayment } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const clientFilter = params.get('client') ?? '';
  const statusFilter = (params.get('status') as LoanStatus | 'all') || 'all';

  const currency = data.settings.currency;
  const [query, setQuery] = useState('');
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<Loan | null>(null);
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);
  const [repaymentLoan, setRepaymentLoan] = useState<Loan | null>(null);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data.clients) map.set(c.id, c.name);
    return map;
  }, [data.clients]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.loans
      .map((loan) => {
        const stats = computeLoanStats(loan, data.repayments);
        const clientName = clientMap.get(loan.clientId) ?? 'Unknown';
        return { loan, stats, clientName };
      })
      .filter(({ loan, stats, clientName }) => {
        if (clientFilter && loan.clientId !== clientFilter) return false;
        if (statusFilter !== 'all' && stats.status !== statusFilter) return false;
        if (!q) return true;
        return (
          clientName.toLowerCase().includes(q) ||
          (loan.notes ?? '').toLowerCase().includes(q) ||
          loan.principal.toString().includes(q)
        );
      })
      .sort((a, b) => new Date(b.loan.startDate).getTime() - new Date(a.loan.startDate).getTime());
  }, [data, clientFilter, statusFilter, query, clientMap]);

  const totalOutstanding = useMemo(
    () => rows.reduce((acc, r) => acc + r.stats.outstanding, 0),
    [rows]
  );

  const openAdd = () => {
    setEditingLoan(null);
    setLoanModalOpen(true);
  };

  const openEdit = (l: Loan) => {
    setEditingLoan(l);
    setLoanModalOpen(true);
  };

  const handleLoanSubmit = (v: Omit<Loan, 'id' | 'createdAt'>) => {
    if (editingLoan) {
      updateLoan({ ...editingLoan, ...v });
      notify('Loan updated');
    } else {
      addLoan(v);
      notify('Loan created');
    }
    setLoanModalOpen(false);
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Header Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search loans..."
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') params.delete('status');
              else params.set('status', val);
              setParams(params);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="closed">Closed</option>
          </select>

          {clientFilter && (
            <button
              onClick={() => {
                params.delete('client');
                setParams(params);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              Client: {clientMap.get(clientFilter)} ✕
            </button>
          )}
        </div>

        <Button onClick={openAdd}>
          <Plus size={16} /> New Loan
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="flex items-center gap-1 font-medium">
          <Landmark size={16} className="text-slate-400" /> {rows.length} loans
        </span>
        <span className="text-slate-300">•</span>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/60">
          {formatCurrency(totalOutstanding, currency, { compact: true })} outstanding
        </span>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={query || clientFilter ? 'No matching loans' : 'No loans issued yet'}
            description={
              query || clientFilter
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first loan agreement to start tracking principal and interest schedules.'
            }
            action={
              !query && !clientFilter && (
                <Button onClick={openAdd}>
                  <Plus size={16} /> Add First Loan
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
                  <th className="px-5 py-3 text-center font-semibold">Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Progress</th>
                  <th className="px-5 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-5 py-3 text-left font-semibold">Next Due</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ loan, stats, clientName }) => (
                  <tr key={loan.id} className="group transition hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div>
                        <button
                          onClick={() => navigate(`/clients?id=${loan.clientId}`)}
                          className="font-semibold text-slate-900 transition hover:text-indigo-600"
                        >
                          {clientName}
                        </button>
                        <p className="text-xs text-slate-400">
                          {loan.notes ? `${loan.notes} · ` : ''}
                          {loan.interestRate}% · {loan.tenureMonths}
                          {loan.interestType?.includes('weekly') ? ' wks' : loan.lumpsumUnit ? ` ${loan.lumpsumUnit}` : ' mo'}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800 tabular">
                      {formatCurrency(loan.principal, currency, { compact: true })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {formatLoanType(loan.interestType)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{stats.paidInstallments}/{stats.totalInstallments}</span>
                          <span>{Math.round(stats.progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all ${
                              stats.isClosed ? 'bg-emerald-500' : stats.isOverdue ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular">
                      {formatCurrency(stats.outstanding, currency, { compact: true })}
                    </td>
                    <td className="px-5 py-3.5">
                      {stats.nextDueDate && !stats.isClosed ? (
                        <div>
                          <p className="font-medium text-slate-700">{formatDate(stats.nextDueDate, 'dd MMM')}</p>
                          <p className="text-xs text-slate-400">{relativeDays(stats.nextDueDate)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {stats.isClosed ? (
                        <Badge tone="emerald"><CheckCircle2 size={12} /> Closed</Badge>
                      ) : stats.isOverdue ? (
                        <Badge tone="rose"><AlertCircle size={12} /> Overdue</Badge>
                      ) : (
                        <Badge tone="emerald"><TrendingUp size={12} /> On track</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setScheduleLoan(loan)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="View Schedule"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(loan)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit Loan"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingLoan(loan)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Loan"
                        >
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

      {/* Modals */}
      <Modal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title={editingLoan ? 'Edit Loan' : 'Create New Loan'}
      >
        <LoanForm
          initial={editingLoan ?? undefined}
          onSubmit={handleLoanSubmit}
          onCancel={() => setLoanModalOpen(false)}
        />
      </Modal>

      {scheduleLoan && (
        <ScheduleModal
          open={!!scheduleLoan}
          loan={scheduleLoan}
          onClose={() => setScheduleLoan(null)}
          onRecordRepayment={() => {
            setRepaymentLoan(scheduleLoan);
            setScheduleLoan(null);
          }}
        />
      )}

      <Modal
        open={!!repaymentLoan}
        onClose={() => setRepaymentLoan(null)}
        title="Record Repayment"
      >
        {repaymentLoan && (
          <RepaymentForm
            preselectedLoanId={repaymentLoan.id}
            onSubmit={(v) => {
              addRepayment(v);
              notify('Repayment recorded');
              setRepaymentLoan(null);
            }}
            onCancel={() => setRepaymentLoan(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletingLoan}
        title="Delete Loan"
        message="Are you sure you want to delete this loan? All associated repayments will also be removed."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deletingLoan) {
            deleteLoan(deletingLoan.id);
            notify('Loan deleted');
            setDeletingLoan(null);
          }
        }}
        onClose={() => setDeletingLoan(null)}
      />
    </div>
  );
}
