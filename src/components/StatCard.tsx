import type { ComponentType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, cn } from './ui';

type Accent = 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate';

const ACCENTS: Record<Accent, { icon: string; ring: string; bar: string }> = {
  emerald: { icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100', bar: 'bg-emerald-500' },
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'ring-rose-100', bar: 'bg-rose-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100', bar: 'bg-amber-500' },
  sky: { icon: 'bg-sky-50 text-sky-600', ring: 'ring-sky-100', bar: 'bg-sky-500' },
  violet: { icon: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100', bar: 'bg-violet-500' },
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'ring-slate-100', bar: 'bg-slate-500' },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  accent?: Accent;
  sub?: string;
  trend?: number; // positive/negative percent
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, accent = 'emerald', sub, trend, onClick }: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 transition-all',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      <div onClick={onClick}>
        <div className="flex items-start justify-between">
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset', a.icon, a.ring)}>
            <Icon size={20} />
          </div>
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              )}
            >
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 tabular">{value}</p>
        {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
        <div className={cn('absolute bottom-0 left-0 h-1 w-full opacity-70', a.bar)} />
      </div>
    </Card>
  );
}
