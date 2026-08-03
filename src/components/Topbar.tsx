import { Menu, Plus, CalendarDays } from 'lucide-react';
import { formatDate } from '../lib/format';
import { Button } from './ui';
import { useQuickActions } from '../lib/quickActions';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Your lending portfolio at a glance' },
  '/clients': { title: 'Clients', subtitle: 'Manage borrowers and their details' },
  '/loans': { title: 'Loans', subtitle: 'Track every loan and its repayment progress' },
  '/repayments': { title: 'Repayments', subtitle: 'Record and review incoming repayments' },
  '/upload': { title: 'Upload Data', subtitle: 'Bulk import clients, loans & repayments' },
  '/settings': { title: 'Settings', subtitle: 'Preferences and data management' },
};

export function Topbar({ onMenuClick, pathname }: { onMenuClick: () => void; pathname: string }) {
  const { recordRepayment } = useQuickActions();
  const meta = TITLES[pathname] ?? { title: 'LendBook', subtitle: '' };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            {meta.title}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{meta.subtitle}</p>
        </div>

        <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 md:flex">
            <CalendarDays size={15} className="text-slate-400" />
            <span className="font-medium">{formatDate(new Date().toISOString(), 'EEE, dd MMM yyyy')}</span>
          </div>
          <Button size="sm" onClick={() => recordRepayment()} className="shadow-sm">
            <Plus size={16} />
            <span className="hidden sm:inline">Record Repayment</span>
            <span className="sm:hidden">Repay</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
