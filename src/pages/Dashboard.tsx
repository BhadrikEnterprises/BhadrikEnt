import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  HandCoins,
  Wallet,
  Clock,
  AlertTriangle,
  Users,
  Landmark,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  CalendarClock,
  IndianRupee,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { computePortfolio, getMonthlySeries, computeLoanStats, computeClientStats } from '../lib/finance';
import { formatCurrency, formatDate, relativeDays } from '../lib/format';
import { StatCard } from '../components/StatCard';
import { Card, Avatar, ProgressBar, Badge } from '../components/ui';
import type { Currency } from '../lib/types';

export function Dashboard() {
  const { data } = useStore();
  const navigate = useNavigate();
  const currency = data.settings.currency;
  const portfolio = useMemo(() => computePortfolio(data), [data]);
  const monthly = useMemo(() => getMonthlySeries(data, 12), [data]);

  // Robust fallback calculation to ensure active loans and active clients display accurately
  const calculatedActiveStats = useMemo(() => {
    const activeLoansList = data.loans.filter((l: any) => {
      const stats = computeLoanStats(l, data.repayments);
      const isExplicitlyClosed = stats.isClosed || l.status === 'closed';
      return !isExplicitlyClosed;
    });

    const activeClientIds = new Set(
      activeLoansList.map((l: any) => l.clientId || l.clientid).filter(Boolean)
    );

    return {
      activeLoansCount: activeLoansList.length,
      activeClientsCount: Math.max(portfolio.activeClients, activeClientIds.size),
    };
  }, [data, portfolio.activeClients]);

  const upcomingAndOverdue = useMemo(() => {
    const items = data.loans
      .map((l) => {
        const st = computeLoanStats(l, data.repayments);
        const client = data.clients.find((c) => c.id === l.clientId || (l as any).clientid === c.id);
        return { loan: l, client, stats: st };
      })
      .filter((x) => !x.stats.isClosed && (x.stats.isOverdue || x.stats.nextDueDate));
    const overdue = items.filter((x) => x.stats.isOverdue).sort((a, b) => b.stats.arrears - a.stats.arrears);
    const upcoming = items
      .filter((x) => !x.stats.isOverdue && x.stats.nextDueDate)
      .sort((a, b) => new Date(a.stats.nextDueDate!).getTime() - new Date(b.stats.nextDueDate!).getTime());
    return { overdue, upcoming };
  }, [data]);

  const topClients = useMemo(() => {
    return data.clients
      .map((c) => ({ client: c, stats: computeClientStats(c.id, data) }))
      .filter((x) => x.stats.outstanding > 0)
      .sort((a, b) => b.stats.outstanding - a.stats.outstanding)
      .slice(0, 5);
  }, [data]);

  const recentRepayments = useMemo(() => {
    return [...data.repayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
      .map((r) => {
        const loan = data.loans.find((l) => l.id === r.loanId);
        const client = data.clients.find((c) => c.id === loan?.clientId || (loan as any)?.clientid === c.id);
        return { repayment: r, loan, client };
      });
  }, [data]);

  const donutData = [
    { name: 'Collected', value: portfolio.totalReceived, color: '#10b981' },
    { name: 'Outstanding', value: portfolio.totalOutstanding, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  if (data.loans.length === 0) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Landmark size={30} />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Welcome to {data.settings.lenderName || 'LendBook'}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Start by adding a client and your first loan. Once you have active loans, this dashboard will show your portfolio overview, cash flow and repayments.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => navigate('/clients')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
              <Users size={16} /> Add a Client
            </button>
            <button onClick={() => navigate('/upload')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Import Data
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Disbursed"
          value={formatCurrency(portfolio.totalLent, currency, { compact: true })}
          icon={HandCoins}
          accent="emerald"
          sub={`across ${portfolio.totalLoans} loans`}
          onClick={() => navigate('/loans')}
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(portfolio.totalReceived, currency, { compact: true })}
          icon={Wallet}
          accent="sky"
          sub={`${data.repayments.length} repayments recorded`}
          onClick={() => navigate('/repayments')}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(portfolio.totalOutstanding, currency, { compact: true })}
          icon={Clock}
          accent="amber"
          sub="principal + interest pending"
        />
        <StatCard
          label="Overdue / At-Risk"
          value={formatCurrency(portfolio.totalOverdue, currency, { compact: true })}
          icon={AlertTriangle}
          accent="rose"
          sub={`${portfolio.overdueLoans} loans need attention`}
        />
      </div>

      {/* Mini stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat icon={<Users size={15} />} label="Active clients" value={String(calculatedActiveStats.activeClientsCount)} />
        <MiniStat icon={<Landmark size={15} />} label="Active loans" value={String(calculatedActiveStats.activeLoansCount)} />
        <MiniStat icon={<CheckCircle2 size={15} />} label="Closed loans" value={String(portfolio.closedLoans)} />
        <MiniStat icon={<TrendingUp size={15} />} label="Weighted rate" value={`${portfolio.weightedRate.toFixed(1)}%`} />
        <MiniStat icon={<IndianRupee size={15} />} label="Collection rate" value={`${portfolio.collectionRate.toFixed(1)}%`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Cash Flow</h3>
              <p className="text-xs text-slate-500">Disbursed vs Collected · last 12 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Disbursed</span>
              <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" />Collected</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDisb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gColl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCurrency(v, currency, { compact: true })} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#10b981" strokeWidth={2} fill="url(#gDisb)" />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#0ea5e9" strokeWidth={2} fill="url(#gColl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Collection Progress</h3>
          <p className="text-xs text-slate-500">Collected vs total receivable</p>
          <div className="relative mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={84} paddingAngle={2} stroke="none">
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-2xl font-bold text-slate-900 tabular">{portfolio.collectionRate.toFixed(0)}%</span>
              <span className="text-xs text-slate-400">collected</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <LegendRow color="#10b981" label="Collected" value={formatCurrency(portfolio.totalReceived, currency, { compact: true })} />
            <LegendRow color="#f59e0b" label="Outstanding" value={formatCurrency(portfolio.totalOutstanding, currency, { compact: true })} />
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming & overdue */}
        <Card className="flex flex-col p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Dues & Overdue</h3>
          <p className="text-xs text-slate-500">What's due next and what's late</p>
          <div className="mt-3 flex-1 space-y-2.5">
            {upcomingAndOverdue.overdue.length === 0 && upcomingAndOverdue.upcoming.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">No upcoming dues 🎉</p>
            )}
            {upcomingAndOverdue.overdue.map((x) => (
              <div key={x.loan.id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
                {x.client && <Avatar name={x.client.name} className="h-8 w-8" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{x.client?.name}</p>
                  <p className="flex items-center gap-1 text-xs text-rose-600">
                    <AlertCircle size={11} /> {formatCurrency(x.stats.arrears, currency, { compact: true })} overdue
                  </p>
                </div>
                <Badge tone="rose">Late</Badge>
              </div>
            ))}
            {upcomingAndOverdue.upcoming.slice(0, 4).map((x) => (
              <div key={x.loan.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                {x.client && <Avatar name={x.client.name} className="h-8 w-8" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{x.client?.name}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <CalendarClock size={11} /> {formatCurrency(x.stats.nextDueAmount, currency, { compact: true })} · {relativeDays(x.stats.nextDueDate!)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top clients by outstanding */}
        <Card className="flex flex-col p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Top Outstanding</h3>
          <p className="text-xs text-slate-500">Clients with the most pending</p>
          <div className="mt-3 flex-1 space-y-3.5">
            {topClients.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">All loans are settled 🎉</p>
            )}
            {topClients.map(({ client, stats }) => {
              const collected = stats.totalReceived + stats.outstanding;
              const pct = collected > 0 ? (stats.totalReceived / collected) * 100 : 0;
              return (
                <button
                  key={client.id}
                  onClick={() => navigate('/clients')}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-slate-50"
                >
                  <Avatar name={client.name} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{client.name}</p>
                      <span className="shrink-0 text-sm font-bold text-slate-900 tabular">{formatCurrency(stats.outstanding, currency, { compact: true })}</span>
                    </div>
                    <ProgressBar value={pct} className="mt-1.5" tone={stats.overdue > 0 ? 'rose' : 'emerald'} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Recent repayments */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">Recent Repayments</h3>
              <p className="text-xs text-slate-500">Latest money received</p>
            </div>
            <button onClick={() => navigate('/repayments')} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              View all <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="mt-3 flex-1 space-y-1">
            {recentRepayments.length === 0 && (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-400">No repayments yet</p>
            )}
            {recentRepayments.map(({ repayment, client }) => (
              <div key={repayment.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <IndianRupee size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{client?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-400">{formatDate(repayment.date, 'dd MMM')} · {repayment.method}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 tabular">+{formatCurrency(repayment.amount, currency, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="font-display text-lg font-bold leading-tight text-slate-900 tabular">{value}</p>
      </div>
    </Card>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-semibold text-slate-800 tabular">{value}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color }} />
          <span className="capitalize text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800 tabular">{formatCurrency(p.value, currency as Currency)}</span>
        </div>
      ))}
    </div>
  );
}
