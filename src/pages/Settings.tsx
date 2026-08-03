import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Building2, Coins, ShieldCheck, UploadCloud, Info } from 'lucide-react';
import { useStore } from '../lib/store';
import { useToast } from '../lib/toast';
import { formatCurrency } from '../lib/format';
import { Button, Card, Field, Input, Select } from '../components/ui';
import type { Currency } from '../lib/types';

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
];

export function Settings() {
  const { data, updateSettings } = useStore();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [lenderName, setLenderName] = useState(data.settings.lenderName);
  const [currency, setCurrency] = useState<Currency>(data.settings.currency);

  const save = () => {
    updateSettings({ lenderName: lenderName.trim() || 'My Lending Book', currency });
    notify('Settings saved');
  };

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Profile</h3>
              <p className="text-xs text-slate-500">Your lending book identity</p>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Lender / Book Name" hint="Shown in the sidebar and exports">
              <Input value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="My Lending Book" />
            </Field>
            <Button onClick={save}>
              <Save size={16} /> Save Changes
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Coins size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Currency</h3>
              <p className="text-xs text-slate-500">Used across all amounts in the app</p>
            </div>
          </div>
          <Field label="Display Currency">
            <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Preview</p>
            <p className="font-display text-2xl font-bold text-slate-900 tabular">
              {formatCurrency(1234567, currency)}
            </p>
            <p className="mt-0.5 text-sm text-slate-400">
              Compact: {formatCurrency(1234567, currency, { compact: true })} ·{' '}
              {formatCurrency(54000, currency, { compact: true })}
            </p>
          </div>
          <Button className="mt-4" variant="outline" onClick={save}>
            <Save size={16} /> Apply Currency
          </Button>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">Data & Privacy</h3>
            <p className="text-xs text-slate-500">Your data is stored only in this browser (localStorage)</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-sm text-slate-500">
            <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              Nothing is sent to any server. Back up your data regularly via JSON export, and use the Upload page to
              bulk import or reset.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/upload')} className="shrink-0">
            <UploadCloud size={16} /> Go to Upload Data
          </Button>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400">
        LendBook · P2P Lending Dashboard — built for tracking clients, loans & repayments
      </p>
    </div>
  );
}
