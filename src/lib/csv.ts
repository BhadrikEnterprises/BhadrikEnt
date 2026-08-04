import Papa from 'papaparse';
import type { AppData } from './types';
import { formatDate } from './format';

export function parseCsv<T = Record<string, string>>(text: string): T[] {
  const res = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });
  return (res.data as T[]).filter((row) =>
    row && Object.values(row as Record<string, unknown>).some((v) => v !== '' && v != null)
  );
}

export function exportCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = Papa.unparse(rows);
  downloadFile(filename, csv, 'text/csv;charset=utf-8;');
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return undefined;
}

/**
 * Generates a unified ledger CSV for a single client (Loans & Repayments)
 */
export function exportClientStatementCSV(clientId: string, data: AppData): void {
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return;

  const clientLoans = data.loans.filter((l) => l.clientId === clientId);
  const clientLoanIds = new Set(clientLoans.map((l) => l.id));
  const clientRepayments = data.repayments.filter((r) => clientLoanIds.has(r.loanId));

  type StatementRow = {
    Date: string;
    Entry_Type: 'LOAN_DISBURSED' | 'REPAYMENT_RECEIVED';
    Loan_Number: string;
    Purpose_Description: string;
    Disbursed_Amount: number;
    Repayment_Amount: number;
    Payment_Method: string;
    Notes: string;
  };

  const rows: StatementRow[] = [];

  // Add loan disbursement entries
  clientLoans.forEach((l) => {
    rows.push({
      Date: formatDate(l.startDate, 'yyyy-MM-dd'),
      Entry_Type: 'LOAN_DISBURSED',
      Loan_Number: l.loanNumber || l.id.slice(0, 6),
      Purpose_Description: l.purpose || 'Loan Principal',
      Disbursed_Amount: l.principal,
      Repayment_Amount: 0,
      Payment_Method: '-',
      Notes: `Rate: ${l.interestRate}% (${l.interestType})`,
    });
  });

  // Add repayment entries
  clientRepayments.forEach((r) => {
    const loan = clientLoans.find((l) => l.id === r.loanId);
    rows.push({
      Date: formatDate(r.date, 'yyyy-MM-dd'),
      Entry_Type: 'REPAYMENT_RECEIVED',
      Loan_Number: loan?.loanNumber || r.loanId.slice(0, 6),
      Purpose_Description: loan?.purpose || 'Loan Repayment',
      Disbursed_Amount: 0,
      Repayment_Amount: r.amount,
      Payment_Method: r.method || 'N/A',
      Notes: r.notes || '',
    });
  });

  // Sort rows chronologically by date
  rows.sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());

  const csvContent = Papa.unparse(rows);
  const safeClientName = client.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadFile(`${safeClientName}_Statement.csv`, csvContent, 'text/csv;charset=utf-8;');
}
