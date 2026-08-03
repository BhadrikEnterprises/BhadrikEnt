import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Landmark,
  HandCoins,
  UploadCloud,
  Settings as SettingsIcon,
  X,
  TrendingUp,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/repayments', label: 'Repayments', icon: HandCoins },
  { to: '/upload', label: 'Upload Data', icon: UploadCloud },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/40">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <p className="font-display text-base font-extrabold leading-none text-white">Bhadrik Enterprises</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            P2P Lending
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} className={cn(isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-3">
        <div className="rounded-xl bg-slate-800/60 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">
              {(data.settings.lenderName || 'B')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {data.settings.lenderName || 'Bhadrik Enterprises'}
              </p>
              <p className="text-xs text-slate-500">{data.settings.currency} · {data.clients.length} clients</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 py-2.5 text-xs font-semibold transition-colors border border-slate-700/50 cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{content}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
