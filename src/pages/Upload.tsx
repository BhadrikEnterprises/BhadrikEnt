import { useRef, useState, type ReactNode } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Users,
  Landmark,
  HandCoins,
  CheckCircle2,
  AlertCircle,
  Database,
  RotateCcw,
  Trash2,
  FileJson,
  FileUp,
  FileText,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { parseCsv, exportCsv, downloadFile, pick } from '../lib/csv';
import { formatCurrency } from '../lib/format';
import { Button, Card, Badge, cn } from '../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Client, Loan, Repayment, InterestType } from '../lib/types';

/* ----------------------------- helpers ----------------------------- */
function parseLooseDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString();
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let [, dd, mm, yy] = m;
    if (yy.length === 2) yy = '20' + yy;
    return new Date(Number(yy), Number(mm) - 1, Number(dd)).toISOString();
  }
  return new Date().toISOString();
}

function normalizeType(raw?: string): InterestType {
  const v = (raw ?? 'emi').toLowerCase().replace(/[\s-]/g, '_');
  if (v.includes('emi') || v.includes('reducing')) return 'emi';
  if (v.includes('interest_only') || v.includes('interestonly') || v === 'interest') return 'interest_only';
  if (v.includes('lump') || v.includes('bullet') || v === 'maturity') return 'lumpsum';
  return 'emi';
}

/* ----------------------- generic CSV importer ----------------------- */
interface PreviewColumn<T> {
  header: string;
  render: (rec: T) => ReactNode;
}

function CsvImporter<T>({
  templateName,
  templateRows,
  columns,
  parse,
  onImport,
  importLabel,
}: {
  templateName: string;
  templateRows: Record<string, unknown>[];
  columns: PreviewColumn<T>[];
  parse: (row: Record<string, string>) => { record: T } | null;
  onImport: (records: T[]) => void;
  importLabel: string;
}) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      setParsed([]);
      return;
    }
    try {
      const text = await file.text();
      const raw = parseCsv(text);
      const recs: T[] = [];
      for (const row of raw) {
        const res = parse(row);
        if (res) recs.push(res.record);
      }
      setTotal(raw.length);
      setParsed(recs);
      if (recs.length === 0) setError('No valid rows found. Check the column headers against the template.');
    } catch {
      setError('Could not read the file. Make sure it is a valid CSV.');
      setParsed([]);
    }
  };

  const reset = () => {
    setParsed([]);
    setFileName('');
    setError('');
    setTotal(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const doImport = () => {
    onImport(parsed);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Download the template, fill it in Excel/Sheets, then upload the CSV below.
        </p>
        <Button variant="outline" size="sm" onClick={() => exportCsv(templateName, templateRows)}>
          <Download size={15} /> Download template
        </Button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
          drag ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-300 bg-slate-50/40 hover:border-slate-400'
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
          <UploadCloud size={24} />
        </div>
        <p className="text-sm font-medium text-slate-700">
          {fileName ? fileName : 'Drag & drop your CSV here'}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
          <FileUp size={15} /> Choose file
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-medium text-slate-700">
                {parsed.length} of {total} rows ready to import
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Cancel
              </Button>
              <Button size="sm" onClick={doImport}>
                <UploadCloud size={15} /> {importLabel} ({parsed.length})
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {columns.map((c) => (
                      <th key={c.header} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold">
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsed.slice(0, 50).map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      {columns.map((c) => (
                        <td key={c.header} className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                          {c.render(rec)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.length > 50 && (
              <p className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-400">
                Showing first 50 of {parsed.length} rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Upload page ------------------------------ */
type TabKey = 'clients' | 'loans' | 'repayments';

export function Upload() {
  const { data, addClient, addLoan, addRepayment, importData, resetData, clearData } = useStore();
  const { notify } = useToast();
  const currency = data.settings.currency;
  const [tab, setTab] = useState<TabKey>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleExportStatementCsv = () => {
    const client = data.clients.find((c) => c.id === selectedClientId);
    if (!client) {
      notify('Please select a client first');
      return;
    }
    const clientLoans = data.loans.filter((l) => l.clientId === client.id);
    if (clientLoans.length === 0) {
      notify('No loans found for this client');
      return;
    }

    const rows: Record<string, any>[] = [];

    // 1. Add individual loan & repayment mapping rows (includes loans with no repayments)
    clientLoans.forEach((loan) => {
      const loanRepayments = data.repayments.filter((r) => r.loanId === loan.id);
      
      if (loanRepayments.length === 0) {
        rows.push({
          Type: 'Loan Item',
          Client: client.name,
          'Loan Purpose': loan.purpose || 'N/A',
          'Principal Amount': loan.principal,
          'Interest Rate (%)': loan.interestRate,
          'Tenure (Months)': loan.tenureMonths,
          'Payment Date': 'No repayments yet',
          'Amount Paid': 0,
          Method: '—',
          Notes: loan.purpose,
        });
      } else {
        loanRepayments.forEach((r) => {
          rows.push({
            Type: 'Repayment',
            Client: client.name,
            'Loan Purpose': loan.purpose || 'N/A',
            'Principal Amount': loan.principal,
            'Interest Rate (%)': loan.interestRate,
            'Tenure (Months)': loan.tenureMonths,
            'Payment Date': r.date.slice(0, 10),
            'Amount Paid': r.amount,
            Method: r.method,
            Notes: r.notes,
          });
        });
      }
    });

    // 2. Add a Summary section at the bottom of the CSV
    const totalPrincipal = clientLoans.reduce((sum, l) => sum + l.principal, 0);
    const allLoanIds = new Set(clientLoans.map((l) => l.id));
    const totalPaid = data.repayments
      .filter((r) => allLoanIds.has(r.loanId))
      .reduce((sum, r) => sum + r.amount, 0);

    rows.push({
      Type: 'SUMMARY TOTAL',
      Client: client.name,
      'Loan Purpose': `Total Loans: ${clientLoans.length}`,
      'Principal Amount': totalPrincipal,
      'Interest Rate (%)': '',
      'Tenure (Months)': '',
      'Payment Date': 'Total Paid:',
      'Amount Paid': totalPaid,
      Method: '',
      Notes: `Outstanding Balance: ${totalPrincipal - totalPaid}`,
    });

    exportCsv(`statement-${client.name.toLowerCase().replace(/\s+/g, '-')}.csv`, rows);
    notify(`Complete statement CSV exported for ${client.name}`);
  };

  const importClients = (records: Omit<Client, 'id' | 'createdAt'>[]) => {
    records.forEach((r) => addClient(r));
    notify(`${records.length} clients imported`);
  };

  const importLoans = (
    records: { loan: Omit<Loan, 'id' | 'createdAt'>; clientName: string; clientExists: boolean }[]
  ) => {
    let created = 0;
    records.forEach(({ loan, clientName, clientExists }) => {
      let clientId = loan.clientId;
      if (!clientExists) {
        const c = addClient({ name: clientName, email: '', phone: '', notes: 'Imported via CSV' });
        clientId = c.id;
        created++;
      }
      addLoan({ ...loan, clientId });
    });
    notify(`${records.length} loans imported${created ? ` · ${created} new clients added` : ''}`);
  };

  const importRepayments = (records: { repayment: Omit<Repayment, 'id'>; borrowerName: string; loanPurpose: string }[]) => {
    records.forEach((r) => addRepayment(r.repayment));
    notify(`${records.length} repayments imported`);
  };

  const handleJsonImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.clients) || !Array.isArray(parsed.loans)) {
        notify('Invalid backup file');
        return;
      }
      importData({
        clients: parsed.clients,
        loans: parsed.loans,
        repayments: parsed.repayments ?? [],
        settings: { ...data.settings, ...(parsed.settings ?? {}) },
      });
      notify('Backup restored');
    } catch {
      notify('Could not restore backup');
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: 'clients', label: 'Clients', icon: Users },
    { key: 'loans', label: 'Loans', icon: Landmark },
    { key: 'repayments', label: 'Repayments', icon: HandCoins },
  ];

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* Import section */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Bulk Import</h3>
            <p className="text-xs text-slate-500">Upload clients, loans or repayments from a CSV file</p>
          </div>
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'clients' && (
          <CsvImporter<Omit<Client, 'id' | 'createdAt'>>
            templateName="lendbook-clients-template.csv"
            templateRows={[{ name: 'Rahul Sharma', email: 'rahul@email.com', phone: '+91 98765 43210', notes: 'Salaried' }]}
            columns={[
              { header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
              { header: 'Email', render: (r) => r.email || '—' },
              { header: 'Phone', render: (r) => r.phone || '—' },
              { header: 'Notes', render: (r) => r.notes || '—' },
            ]}
            parse={(row) => {
              const name = pick(row, ['name', 'client', 'client_name', 'borrower']);
              if (!name) return null;
              return {
                record: {
                  name,
                  email: pick(row, ['email', 'e_mail']) ?? '',
                  phone: pick(row, ['phone', 'mobile', 'contact', 'phone_number']) ?? '',
                  notes: pick(row, ['notes', 'note', 'remark', 'remarks']) ?? '',
                },
              };
            }}
            onImport={importClients}
            importLabel="Import clients"
          />
        )}

        {tab === 'loans' && (
          <CsvImporter<{ loan: Omit<Loan, 'id' | 'createdAt'>; clientName: string; clientExists: boolean }>
            templateName="lendbook-loans-template.csv"
            templateRows={[
              { client: 'Rahul Sharma', principal: 200000, rate: 14, start: '2024-01-15', tenure: 24, type: 'emi', purpose: 'Home renovation' },
            ]}
            columns={[
              {
                header: 'Client',
                render: (r) => (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                    {r.clientName}
                    <Badge tone={r.clientExists ? 'emerald' : 'amber'}>{r.clientExists ? 'existing' : 'new'}</Badge>
                  </span>
                ),
              },
              { header: 'Principal', render: (r) => formatCurrency(r.loan.principal, currency, { compact: true }) },
              { header: 'Rate', render: (r) => `${r.loan.interestRate}%` },
              { header: 'Tenure', render: (r) => `${r.loan.tenureMonths}mo` },
              { header: 'Type', render: (r) => r.loan.interestType },
              { header: 'Purpose', render: (r) => r.loan.purpose || '—' },
            ]}
            parse={(row) => {
              const clientName = pick(row, ['client', 'client_name', 'borrower', 'name']);
              const principal = Number(pick(row, ['principal', 'amount', 'loan_amount', 'lent']) ?? '0');
              const tenure = parseInt(pick(row, ['tenure', 'tenure_months', 'months', 'term']) ?? '0', 10);
              if (!clientName || !(principal > 0) || !(tenure > 0)) return null;
              const existing = data.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
              return {
                record: {
                  loan: {
                    clientId: existing?.id ?? '',
                    principal,
                    interestRate: Number(pick(row, ['rate', 'interest', 'interest_rate', 'annual_rate']) ?? '0'),
                    startDate: parseLooseDate(pick(row, ['start', 'start_date', 'startdate', 'date', 'disbursed'])),
                    tenureMonths: tenure,
                    interestType: normalizeType(pick(row, ['type', 'interest_type', 'plan'])),
                    purpose: pick(row, ['purpose', 'note', 'notes', 'reason']) ?? '',
                  },
                  clientName,
                  clientExists: !!existing,
                },
              };
            }}
            onImport={importLoans}
            importLabel="Import loans"
          />
        )}

        {tab === 'repayments' && (
          <CsvImporter<{ repayment: Omit<Repayment, 'id'>; borrowerName: string; loanPurpose: string }>
            templateName="lendbook-repayments-template.csv"
            templateRows={[
              { client: 'Rahul Sharma', purpose: 'Home renovation', amount: 10000, date: '2024-02-15', method: 'UPI', notes: 'Installment 1' },
            ]}
            columns={[
              { header: 'Borrower', render: (r) => <span className="font-medium text-slate-800">{r.borrowerName}</span> },
              { header: 'Loan', render: (r) => r.loanPurpose || '—' },
              { header: 'Amount', render: (r) => <span className="font-semibold text-emerald-600 tabular">{formatCurrency(r.repayment.amount, currency)}</span> },
              { header: 'Date', render: (r) => r.repayment.date.slice(0, 10) },
              { header: 'Method', render: (r) => r.repayment.method },
            ]}
            parse={(row) => {
              const clientName = pick(row, ['client', 'client_name', 'borrower']);
              const purpose = pick(row, ['purpose', 'loan', 'loan_purpose']);
              const amount = Number(pick(row, ['amount', 'paid', 'repayment', 'repayment_amount']) ?? '0');
              if (!clientName || !(amount > 0)) return null;
              const client = data.clients.find((c) => c.name.toLowerCase() === clientName.toLowerCase());
              if (!client) return null;
              const loan =
                data.loans.find(
                  (l) =>
                    l.clientId === client.id &&
                    (!purpose || (l.purpose || '').toLowerCase() === purpose.toLowerCase())
                ) ?? data.loans.find((l) => l.clientId === client.id);
              if (!loan) return null;
              return {
                record: {
                  repayment: {
                    loanId: loan.id,
                    date: parseLooseDate(pick(row, ['date', 'paid_date', 'payment_date'])),
                    amount,
                    method: pick(row, ['method', 'payment_method', 'mode']) ?? 'UPI',
                    notes: pick(row, ['notes', 'note', 'remark']) ?? '',
                  },
                  borrowerName: client.name,
                  loanPurpose: loan.purpose,
                },
              };
            }}
            onImport={importRepayments}
            importLabel="Import repayments"
          />
        )}
      </Card>

      {/* Export section */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <Download size={18} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Export Data</h3>
            <p className="text-xs text-slate-500">Download your data as CSV or back up everything as JSON</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" size="sm" onClick={() => exportCsv('lendbook-clients.csv', data.clients.map((c) => ({ name: c.name, email: c.email, phone: c.phone, notes: c.notes })))}>
              <Users size={15} /> Clients CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCsv(
                  'lendbook-loans.csv',
                  data.loans.map((l) => {
                    const c = data.clients.find((x) => x.id === l.clientId);
                    return {
                      client: c?.name ?? '',
                      principal: l.principal,
                      rate: l.interestRate,
                      start: l.startDate.slice(0, 10),
                      tenure: l.tenureMonths,
                      type: l.interestType,
                      purpose: l.purpose,
                    };
                  })
                )
              }
            >
              <Landmark size={15} /> Loans CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCsv(
                  'lendbook-repayments.csv',
                  data.repayments.map((r) => {
                    const loan = data.loans.find((l) => l.id === r.loanId);
                    const c = data.clients.find((x) => x.id === loan?.clientId);
                    return {
                      client: c?.name ?? '',
                      purpose: loan?.purpose ?? '',
                      amount: r.amount,
                      date: r.date.slice(0, 10),
                      method: r.method,
                      notes: r.notes,
                    };
                  })
                )
              }
            >
              <HandCoins size={15} /> Repayments CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile('lendbook-backup.json', JSON.stringify(data, null, 2), 'application/json')}
            >
              <FileJson size={15} /> JSON Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => jsonInputRef.current?.click()}>
              <FileUp size={15} /> Restore JSON
            </Button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleJsonImport(f);
                if (e.target) e.target.value = '';
              }}
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Generate Individual Client Statement
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select a Client...</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportStatementCsv}
                disabled={!selectedClientId}
              >
                <FileText size={15} /> Statement CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Database size={18} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Data Management</h3>
            <p className="text-xs text-slate-500">
              {data.clients.length} clients · {data.loans.length} loans · {data.repayments.length} repayments stored locally in this browser
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={15} /> Reset to sample data
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} className="text-rose-600 hover:bg-rose-50">
            <Trash2 size={15} /> Clear all data
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset to sample data?"
        message="This replaces all current data with the built-in sample dataset. Your current data will be lost — export a backup first if needed."
        confirmLabel="Reset data"
        danger
        onConfirm={() => {
          resetData();
          notify('Sample data restored');
        }}
        onClose={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        message="This permanently deletes all clients, loans and repayments. Make sure you have exported a backup. This cannot be undone."
        confirmLabel="Clear everything"
        danger
        onConfirm={() => {
          clearData();
          notify('All data cleared');
        }}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
