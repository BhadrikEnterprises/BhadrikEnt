import { format, parseISO } from 'date-fns';
import type { Currency } from './types';

const CURRENCY: Record<Currency, { symbol: string; locale: string }> = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'en-IE' },
  GBP: { symbol: '£', locale: 'en-GB' },
};

export function currencySymbol(currency: Currency): string {
  return (CURRENCY[currency] ?? CURRENCY.INR).symbol;
}

function compact(amount: number, currency: Currency): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (currency === 'INR') {
    if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  } else {
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}${abs.toFixed(0)}`;
}

export function formatCurrency(
  amount: number,
  currency: Currency = 'INR',
  opts?: { compact?: boolean; decimals?: number }
): string {
  const c = CURRENCY[currency] ?? CURRENCY.INR;
  const decimals = opts?.decimals ?? 0;
  if (opts?.compact) {
    return `${c.symbol}${compact(amount, currency)}`;
  }
  return `${c.symbol}${amount.toLocaleString(c.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatDate(iso: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(iso), fmt);
  } catch {
    return iso;
  }
}

export function formatMonthYear(iso: string): string {
  return formatDate(iso, 'MMM yyyy');
}

export function toISODate(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

export function todayISODate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function relativeDays(iso: string): string {
  const diff = parseISO(iso).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
