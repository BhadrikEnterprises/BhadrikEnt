import { useState } from 'react';
import { useStore } from '../lib/store';
import { Save, Trash2, Check } from 'lucide-react';

export function Settings() {
  const { data, setData } = useStore();
  const [lenderName, setLenderName] = useState(data.settings.lenderName);
  const [currency, setCurrency] = useState(data.settings.currency);
  const [saved, setSaved] = useState(false);
  const [currencySaved, setCurrencySaved] = useState(false);

  const handleSave = () => {
    setData((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, lenderName, currency },
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveCurrency = () => {
    setData((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, currency },
    }));
    setCurrencySaved(true);
    setTimeout(() => setCurrencySaved(false), 2000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Are you sure you want to delete all present data? This will clear all clients, loans, and repayments.'
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Preferences and data management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Profile</h2>
          <p className="text-xs text-slate-500 mb-4">Your lending book identity</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lender / Book Name
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Currency Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Currency</h2>
          <p className="text-xs text-slate-500 mb-4">Used across all amounts in the app</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>
            <button
              onClick={handleSaveCurrency}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {currencySaved ? <Check size={16} className="text-emerald-600" /> : null}
              {currencySaved ? 'Applied!' : 'Apply Currency'}
            </button>
          </div>
        </div>
      </div>

      {/* Data & Privacy Card with Clear Data Button */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Data & Privacy</h2>
        <p className="text-xs text-slate-500 mb-4">
          Your data is stored only in this browser (localStorage). Nothing is sent to any server.
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-800">Clear All App Data</p>
            <p className="text-xs text-slate-500">
              Permanently remove all clients, loans, and repayments to start fresh.
            </p>
          </div>
          <button
            onClick={handleResetData}
            className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}
