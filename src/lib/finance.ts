import {
  addDays,
  addMonths,
  addWeeks,
  eachMonthOfInterval,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import type { AppData, Loan, Repayment } from './types';

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export interface ScheduleRow {
  installment: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
}

export function generateSchedule(loan: Loan): ScheduleRow[] {
  const start = parseISO(loan.startDate);
  const n = loan.tenureMonths; // represents tenure count (days, weeks, or months)
  const rows: ScheduleRow[] = [];
  if (n <= 0) return rows;

  // 1. Weekly Upfront Deduction (e.g. 1,00,000 principal, 80k issued, 1,00,000 repaid over n weeks)
  if (loan.interestType === 'weekly_upfront_deduction') {
    const weeklyEmi = loan.principal / n;
    let balance = loan.principal;

    for (let i = 1; i <= n; i++) {
      balance = Math.max(0, balance - weeklyEmi);
      rows.push({
        installment: i,
        dueDate: addWeeks(start, i).toISOString(),
        amount: round(weeklyEmi),
        principal: round(weeklyEmi),
        interest: 0,
        balance: round(balance),
      });
    }
    return rows;
  }

  // 2. Weekly Interest-Only
  if (loan.interestType === 'weekly_interest_only') {
    const weeklyInterest = (loan.principal * loan.interestRate) / 100;
    for (let i = 1; i <= n; i++) {
      const isLast = i === n;
      const principalPart = isLast ? loan.principal : 0;
      const amount = isLast ? loan.principal + weeklyInterest : weeklyInterest;
      rows.push({
        installment: i,
        dueDate: addWeeks(start, i).toISOString(),
        amount: round(amount),
        principal: round(principalPart),
        interest: round(weeklyInterest),
        balance: round(isLast ? 0 : loan.principal),
      });
    }
    return rows;
  }

  // 3. Weekly Reducing Balance EMI
  if (loan.interestType === 'weekly_reducing') {
    const r = loan.interestRate / 100 / 52; // weekly rate
    let emi: number;
    if (r === 0) emi = loan.principal / n;
    else emi = (loan.principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

    let balance = loan.principal;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      let principal = emi - interest;
      if (i === n) principal = balance;
      balance = Math.max(0, balance - principal);
      rows.push({
        installment: i,
        dueDate: addWeeks(start, i).toISOString(),
        amount: round(emi),
        principal: round(principal),
        interest: round(interest),
        balance: round(balance),
      });
    }
    return rows;
  }

  // 4. Monthly EMI (Reducing Balance)
  if (loan.interestType === 'emi') {
    const r = loan.interestRate / 100 / 12;
    let emi: number;
    if (r === 0) emi = loan.principal / n;
    else emi = (loan.principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let balance = loan.principal;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      let principal = emi - interest;
      if (i === n) principal = balance;
      balance = Math.max(0, balance - principal);
      rows.push({
        installment: i,
        dueDate: addMonths(start, i).toISOString(),
        amount: round(emi),
        principal: round(principal),
        interest: round(interest),
        balance: round(balance),
      });
    }
    return rows;
  }

  // 5. Monthly Interest-Only
  if (loan.interestType === 'interest_only') {
    const monthlyInterest = (loan.principal * loan.interestRate) / 100;
    for (let i = 1; i <= n; i++) {
      const isLast = i === n;
      const principalPart = isLast ? loan.principal : 0;
      const amount = isLast ? loan.principal + monthlyInterest : monthlyInterest;
      rows.push({
        installment: i,
        dueDate: addMonths(start, i).toISOString(),
        amount: round(amount),
        principal: round(principalPart),
        interest: round(monthlyInterest),
        balance: round(isLast ? 0 : loan.principal),
      });
    }
    return rows;
  }

  // 6. Lumpsum at Maturity
  let maturityDate = addMonths(start, n);
  let totalInterest = (loan.principal * (loan.interestRate / 100)) * n;

  if (loan.lumpsumUnit === 'days') {
    maturityDate = addDays(start, n);
    totalInterest = (loan.principal * (loan.interestRate / 100)) * (n / 30);
  } else if (loan.lumpsumUnit === 'weeks') {
    maturityDate = addWeeks(start, n);
  }

  const total = loan.principal + totalInterest;
  rows.push({
    installment: 1,
    dueDate: maturityDate.toISOString(),
    amount: round(total),
    principal: round(loan.principal),
    interest: round(totalInterest),
    balance: 0,
  });

  return rows;
}

export type LoanStatus = 'closed' | 'overdue' | 'active';

export interface LoanStats {
  schedule: ScheduleRow[];
  totalPayable: number;
  totalInterest: number;
  received: number;
  outstanding: number;
  expectedToDate: number;
  arrears: number;
  isOverdue: boolean;
  isClosed: boolean;
  progress: number;
  status: LoanStatus;
  nextDueDate: string | null;
  nextDueAmount: number;
  paidInstallments: number;
  totalInstallments: number;
  maturityDate: string;
}

export function computeLoanStats(
  loan: Loan,
  repayments: Repayment[],
  today = new Date()
): LoanStats {
  const schedule = generateSchedule(loan);
  const totalPayable = round(sum(schedule.map((s) => s.amount)));
  const totalInterest = round(sum(schedule.map((s) => s.interest)));
  const received = round(
    sum(repayments.filter((r) => r.loanId === loan.id).map((r) => r.amount))
  );
  const outstanding = round(Math.max(0, totalPayable - received));
  const past = schedule.filter((s) => parseISO(s.dueDate) <= today);
  const expectedToDate = round(sum(past.map((s) => s.amount)));
  const arrears = round(Math.min(outstanding, Math.max(0, expectedToDate - received)));
  const isClosed = outstanding <= 0.5;
  const isOverdue = !isClosed && arrears > 0.5;
  const progress =
    totalPayable > 0 ? Math.min(100, (received / totalPayable) * 100) : 0;

  let paidInstallments = 0;
  let nextDue: ScheduleRow | null = null;
  let cum = 0;
  for (const s of schedule) {
    cum += s.amount;
    if (received + 0.5 >= cum) paidInstallments++;
    else if (!nextDue) nextDue = s;
  }
  const maturityDate = schedule.length
    ? schedule[schedule.length - 1].dueDate
    : loan.startDate;
  const status: LoanStatus = isClosed ? 'closed' : isOverdue ? 'overdue' : 'active';

  return {
    schedule,
    totalPayable,
    totalInterest,
    received,
    outstanding,
    expectedToDate,
    arrears,
    isOverdue,
    isClosed,
    progress,
    status,
    nextDueDate: nextDue ? nextDue.dueDate : null,
    nextDueAmount: nextDue ? nextDue.amount : 0,
    paidInstallments,
    totalInstallments: schedule.length,
    maturityDate,
  };
}

export interface PortfolioStats {
  totalLent: number;
  totalReceivable: number;
  totalInterestExpected: number;
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  collectionRate: number;
  activeClients: number;
  activeLoans: number;
  closedLoans: number;
  overdueLoans: number;
  totalLoans: number;
  avgInterestRate: number;
  weightedRate: number;
}

export function computePortfolio(data: AppData): PortfolioStats {
  const today = new Date();
  let totalLent = 0;
  let totalReceivable = 0;
  let totalInterestExpected = 0;
  let totalReceived = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let activeLoans = 0;
  let closedLoans = 0;
  let overdueLoans = 0;
  let rateSum = 0;
  let weighted = 0;
  const activeClientIds = new Set<string>();

  for (const loan of data.loans) {
    const st = computeLoanStats(loan, data.repayments, today);
    // Use net disbursed amount if applicable, otherwise full principal
    const actualDisbursed = loan.disbursedAmount ?? loan.principal;
    totalLent += actualDisbursed;
    totalReceivable += st.totalPayable;
    totalInterestExpected += st.totalInterest;
    totalReceived += st.received;
    totalOutstanding += st.outstanding;
    totalOverdue += st.arrears;
    rateSum += loan.interestRate;
    weighted += loan.interestRate * loan.principal;
    if (st.isClosed) closedLoans++;
    else {
      activeClientIds.add(loan.clientId);
      if (st.isOverdue) overdueLoans++;
      else activeLoans++;
    }
  }

  return {
    totalLent: round(totalLent),
    totalReceivable: round(totalReceivable),
    totalInterestExpected: round(totalInterestExpected),
    totalReceived: round(totalReceived),
    totalOutstanding: round(totalOutstanding),
    totalOverdue: round(totalOverdue),
    collectionRate: totalReceivable > 0 ? (totalReceived / totalReceivable) * 100 : 0,
    activeClients: activeClientIds.size,
    activeLoans,
    closedLoans,
    overdueLoans,
    totalLoans: data.loans.length,
    avgInterestRate: data.loans.length ? rateSum / data.loans.length : 0,
    weightedRate: totalLent > 0 ? weighted / totalLent : 0,
  };
}

export interface MonthlyPoint {
  label: string;
  disbursed: number;
  collected: number;
}

export function getMonthlySeries(data: AppData, months = 12): MonthlyPoint[] {
  const now = startOfMonth(new Date());
  const start = subMonths(now, months - 1);
  const arr = eachMonthOfInterval({ start, end: now });
  return arr.map((m) => {
    const disbursed = data.loans
      .filter((l) => isSameMonth(parseISO(l.startDate), m))
      .reduce((s, l) => s + (l.disbursedAmount ?? l.principal), 0);
    const collected = data.repayments
      .filter((r) => isSameMonth(parseISO(r.date), m))
      .reduce((s, r) => s + r.amount, 0);
    return {
      label: format(m, 'MMM yy'),
      disbursed: round(disbursed),
      collected: round(collected),
    };
  });
}

export interface ClientStats {
  loanCount: number;
  totalLent: number;
  totalReceived: number;
  outstanding: number;
  overdue: number;
}

export function computeClientStats(
  clientId: string,
  data: AppData,
  today = new Date()
): ClientStats {
  const loans = data.loans.filter((l) => l.clientId === clientId);
  let totalLent = 0;
  let totalReceived = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const l of loans) {
    const st = computeLoanStats(l, data.repayments, today);
    totalLent += l.disbursedAmount ?? l.principal;
    totalReceived += st.received;
    outstanding += st.outstanding;
    overdue += st.arrears;
  }
  return {
    loanCount: loans.length,
    totalLent: round(totalLent),
    totalReceived: round(totalReceived),
    outstanding: round(outstanding),
    overdue: round(overdue),
  };
}
