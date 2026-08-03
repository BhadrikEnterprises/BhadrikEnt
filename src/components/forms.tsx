import { useMemo, useState } from 'react';
import { CalendarClock, IndianRupee, Percent, Clock, Sparkles } from 'lucide-react';
import type { Client, InterestType, Loan, Repayment } from '../lib/types';
import { useStore } from '../lib/store';
import { generateSchedule } from '../lib/finance';
import { formatCurrency, todayISODate, toISODate } from '../lib/format';
import { Button, Field, Input, Select, Textarea } from './ui';

interface BaseProps {
  onCancel: () => void;
  submitLabel?: string;
}

/* ------------------------------- ClientForm ------------------------------- */
export function ClientForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save Client',
}: BaseProps & {
  initial?: Client;
  onSubmit: (v: Omit<Client, 'id' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [err, setErr] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr('Client name is required.');
      return;
    }
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
        </Field>
      </div>
      <Field label="Notes" hint="Occupation, relationship, KYC reference, etc.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about this borrower" />
      </Field>
      {err && <p className="text-sm font-medium text-rose-500">{err}</p>}
      <div className="flex justify-end gap-2.5 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

/* -------------------------------- LoanForm -------------------------------- */
const TYPE_OPTIONS: { value: InterestType; label: string; hint: string }[] = [
  { value: 'emi', label: 'EMI · reducing balance', hint: 'Equal monthly installments' },
  { value: 'interest_only', label: 'Interest-only monthly', hint: 'Interest monthly, principal at end' },
  { value: 'lumpsum', label: 'Lumpsum at maturity', hint: 'Single payment with simple interest' },
  { value: 'weekly_reducing', label: 'Weekly EMI · reducing balance', hint: 'Equal weekly installments' },
  { value: 'weekly_interest_only', label: 'Weekly Interest-only', hint: 'Interest weekly, principal at end' },
  { value: 'weekly_upfront_deduction', label: 'Weekly Finance', hint: 'Upfront deduction / retention' },
];

export function LoanForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save Loan',
}: BaseProps & {
  initial?: Loan;
  onSubmit: (v: Omit<Loan, 'id' | 'createdAt'>) => void;
}) {
  const { data } = useStore();
  const currency = data.settings.currency;
  const [clientId, setClientId] = useState(initial?.clientId ?? data.clients[0]?.id ?? '');
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : '');
  const [interestRate, setInterestRate] = useState(initial ? String(initial.interestRate) : '');
  const [upfrontDeduction, setUpfrontDeduction] = useState(initial?.upfrontDeduction ? String(initial.upfrontDeduction) : '');
  const [startDate, setStartDate] = useState(initial ? toISODate(initial.startDate) : todayISODate());
  const [tenure, setTenure] = useState(initial ? String(initial.tenureMonths) : '10');
  const [lumpsumUnit, setLumpsumUnit] = useState<'days' | 'weeks' | 'months'>('months');
  const [interestType, setType] = useState<InterestType>(initial?.interestType ?? 'emi');
  const [purpose, setPurpose] = useState(initial?.purpose ?? '');
  const [err, setErr] = useState<string>();

  const isWeekly = interestType.startsWith('weekly');
  const isLumpsum = interestType === 'lumpsum';
  const isUpfront = interestType === 'weekly_upfront_deduction';

  // Dynamic Interest Rate Label
  const interestRateLabel = useMemo(() => {
    if (isWeekly) return 'Weekly Interest Rate (%)';
    if (interestType === 'interest_only') return 'Monthly Interest Rate (%)';
    return 'Annual Interest Rate (%)';
  }, [interestType, isWeekly]);

  // Dynamic Tenure Label
  const tenureLabel = useMemo(() => {
    if (isLumpsum) return `Tenure (${lumpsumUnit})`;
    if (isWeekly) return 'Tenure (weeks)';
    return 'Tenure (months)';
  }, [isLumpsum, lumpsumUnit, isWeekly]);

  const preview = useMemo(() => {
    const p = Number(principal) || 0;
    const r = Number(interestRate) || 0;
    const n = Number(tenure) || 0;
    const deduction = Number(upfrontDeduction) || 0;

    if (p <= 0 || n <= 0) return null;

    const loan = {
      id: 'preview',
      clientId,
      principal: p,
      interestRate: r,
      upfrontDeduction: deduction,
      startDate: new Date(startDate).toISOString(),
      tenureMonths: n,
      lumpsumUnit: isLumpsum ? lumpsumUnit : undefined,
      interestType,
      purpose,
      createdAt: new Date().toISOString(),
    } as Loan;

    const sched = generateSchedule(loan);
    const total = sched.reduce((s, x) => s + x.amount, 0);
    const interest = isUpfront ? deduction : sched.reduce((s, x) => s + x.interest, 0);

    return {
      installmentAmount: sched[0]?.amount ?? 0,
      total: isUpfront ? p : total,
      interest,
      isLumpsum,
      isInterestOnly: interestType === 'interest_only' || interestType === 'weekly_interest_only',
      isWeekly,
    };
  }, [principal, interestRate, upfrontDeduction, tenure, lumpsumUnit, startDate, interestType, clientId, purpose, isLumpsum, isUpfront, isWeekly]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErr('Select a client first.');
      return;
    }
    if (!(Number(principal) > 0)) {
      setErr('Principal must be greater than 0.');
      return;
    }
    if (!isUpfront && Number(interestRate) < 0) {
      setErr('Interest rate cannot be negative.');
      return;
    }
    if (isUpfront && !(Number(upfrontDeduction) >= 0)) {
      setErr('Please enter a valid upfront deduction amount.');
      return;
    }
    if (!(Number(tenure) > 0)) {
      setErr('Tenure must be greater than 0.');
      return;
    }

    onSubmit({
      clientId,
      principal: Number(principal),
      interestRate: isUpfront ? 0 : Number(interestRate) || 0,
      upfrontDeduction: isUpfront ? Number(upfrontDeduction) || 0 : undefined,
      startDate: new Date(startDate).toISOString(),
      tenureMonths: Number(tenure),
      lumpsumUnit: isLumpsum ? lumpsumUnit : undefined,
      interestType,
      purpose: purpose.trim(),
    });
  };

  if (data.clients.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        You need to add a client before creating a loan. Head to the <strong>Clients</strong> page first.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Client" required>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {data.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Purpose / Note">
        <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Business expansion" />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Principal Amount" required>
          <div className="relative">
            <IndianRupee size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="number" min="0" step="any" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="100000" className="pl-8" />
          </div>
        </Field>

        {isUpfront ? (
          <Field label="Upfront Deduction / Retention" required>
            <div className="relative">
              <IndianRupee size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input type="number" min="0" step="any" value={upfrontDeduction} onChange={(e) => setUpfrontDeduction(e.target.value)} placeholder="10000" className="pl-8" />
            </div>
          </Field>
        ) : (
          <Field label={interestRateLabel} required>
            <div className="relative">
              <Percent size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input type="number" min="0" step="any" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="14" className="pl-8" />
            </div>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start Date" required>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-2">
          <Field label={tenureLabel} required>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Clock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input type="number" min="1" step="1" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="10" className="pl-8" />
              </div>
              {isLumpsum && (
                <Select value={lumpsumUnit} onChange={(e) => setLumpsumUnit(e.target.value as 'days' | 'weeks' | 'months')} className="w-28">
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </Select>
              )}
            </div>
          </Field>
        </div>
      </div>

      <Field label="Interest Type" required>
        <Select value={interestType} onChange={(e) => setType(e.target.value as InterestType)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} — {o.hint}
            </option>
          ))}
        </Select>
      </Field>

      {preview && (
        <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <PreviewStat
            icon={<Sparkles size={14} className="text-emerald-600" />}
            label={
              preview.isLumpsum
                ? 'Due at maturity'
                : preview.isInterestOnly
                ? preview.isWeekly ? 'Weekly interest' : 'Monthly interest'
                : preview.isWeekly ? 'Weekly EMI' : 'Monthly EMI'
            }
            value={formatCurrency(preview.installmentAmount, currency, { compact: true })}
          />
          <PreviewStat
            icon={<CalendarClock size={14} className="text-sky-600" />}
            label="Total Payable"
            value={formatCurrency(preview.total, currency, { compact: true })}
          />
          <PreviewStat
            icon={<Percent size={14} className="text-violet-600" />}
            label="Total Interest / Fee"
            value={formatCurrency(preview.interest, currency, { compact: true })}
          />
        </div>
      )}

      {err && <p className="text-sm font-medium text-rose-500">{err}</p>}
      <div className="flex justify-end gap-2.5 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

function PreviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="font-display text-base font-bold text-slate-900 tabular">{value}</p>
    </div>
  );
}

/* ----------------------------- RepaymentForm ------------------------------ */
const METHODS = ['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Other'];

export function RepaymentForm({
  initial,
  presetLoanId,
  onSubmit,
  onCancel,
  submitLabel = 'Record Repayment',
}: BaseProps & {
  initial?: Repayment;
  presetLoanId?: string;
  onSubmit: (v: Omit<Repayment, 'id'>) => void;
}) {
  const { data } = useStore();
  const currency = data.settings.currency;
  const activeLoans = data.loans;
  const [loanId, setLoanId] = useState(initial?.loanId ?? presetLoanId ?? activeLoans[0]?.id ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial ? toISODate(initial.date) : todayISODate());
  const [method, setMethod] = useState(initial?.method ?? 'UPI');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [err, setErr] = useState<string>();

  const selectedLoan = activeLoans.find((l) => l.id === loanId);
  const client = data.clients.find((c) => c.id === selectedLoan?.clientId);
  const outstanding = useMemo(() => {
    if (!selectedLoan) return 0;
    const sched = generateSchedule(selectedLoan);
    const total = sched.reduce((s, x) => s + x.amount, 0);
    const paid = data.repayments.filter((r) => r.loanId === selectedLoan.id).reduce((s, r) => s + r.amount, 0);
    return Math.max(0, total - paid);
  }, [selectedLoan, data.repayments]);

  const nextDue = useMemo(() => {
    if (!selectedLoan) return null;
    const sched = generateSchedule(selectedLoan);
    let cum = 0;
    const paid = data.repayments.filter((r) => r.loanId === selectedLoan.id).reduce((s, r) => s + r.amount, 0);
    for (const s of sched) {
      cum += s.amount;
      if (paid + 0.5 < cum) return s;
    }
    return null;
  }, [selectedLoan, data.repayments]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanId) {
      setErr('Select a loan to record repayment against.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setErr('Repayment amount must be greater than 0.');
      return;
    }
    onSubmit({
      loanId,
      date: new Date(date).toISOString(),
      amount: Number(amount),
      method,
      notes: notes.trim(),
    });
  };

  if (activeLoans.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        No loans exist yet. Add a loan first before recording a repayment.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Loan" required>
        <Select value={loanId} onChange={(e) => setLoanId(e.target.value)}>
          {activeLoans.map((l) => {
            const c = data.clients.find((x) => x.id === l.clientId);
            return (
              <option key={l.id} value={l.id}>
                {c?.name ?? 'Unknown'} — {l.purpose || 'Loan'} · {formatCurrency(l.principal, currency, { compact: true })}
              </option>
            );
          })}
        </Select>
      </Field>

      {selectedLoan && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs">
          <span className="text-slate-500">
            Borrower: <span className="font-semibold text-slate-700">{client?.name}</span>
          </span>
          <span className="text-slate-500">
            Outstanding: <span className="font-semibold text-slate-900 tabular">{formatCurrency(outstanding, currency)}</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Amount Received" required>
          <div className="relative">
            <IndianRupee size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="pl-8" autoFocus />
          </div>
          {nextDue && (
            <button
              type="button"
              onClick={() => setAmount(String(nextDue.amount))}
              className="mt-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Fill expected installment ({formatCurrency(nextDue.amount, currency, { compact: true })})
            </button>
          )}
        </Field>
        <Field label="Date Received" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Payment Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      {err && <p className="text-sm font-medium text-rose-500">{err}</p>}
      <div className="flex justify-end gap-2.5 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
