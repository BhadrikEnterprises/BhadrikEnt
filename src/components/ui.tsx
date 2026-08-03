import { clsx } from 'clsx';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Loader2 } from 'lucide-react';

export function cn(...args: Parameters<typeof clsx>): string {
  return clsx(...args);
}

/* ---------------------------------- Button -------------------------------- */
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'dark';
type ButtonSize = 'sm' | 'md' | 'icon' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]',
  outline:
    'bg-white text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]',
  ghost:
    'text-black hover:bg-yellow-200 border-2 border-transparent hover:border-black transition-all',
  danger:
    'bg-rose-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]',
  subtle:
    'bg-sky-200 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-sky-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]',
  dark: 'bg-black text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(100,100,100,1)] hover:bg-neutral-800 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 font-bold',
  md: 'h-10 px-4 text-sm gap-2 font-black',
  lg: 'h-11 px-5 text-base gap-2 font-black',
  icon: 'h-9 w-9 font-black',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin stroke-[3]" />}
      {children}
    </button>
  );
}

/* ----------------------------------- Card --------------------------------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 border-black bg-white p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Inputs -------------------------------- */
const FIELD_BASE =
  'w-full rounded-lg border-2 border-black bg-white px-3 py-2.5 text-sm font-bold text-black placeholder:text-gray-500 placeholder:font-normal outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all focus:bg-amber-50 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_BASE, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD_BASE, 'min-h-[80px] resize-y', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(FIELD_BASE, 'cursor-pointer appearance-none bg-no-repeat pr-9', props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: 'right 0.6rem center',
        ...props.style,
      }}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-black">
          {label} {required && <span className="text-rose-600">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs font-semibold text-gray-600">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-bold text-rose-600">{error}</span>}
    </label>
  );
}

/* ---------------------------------- Badge --------------------------------- */
type Tone = 'emerald' | 'rose' | 'amber' | 'sky' | 'violet' | 'slate' | 'blue';
const TONES: Record<Tone, string> = {
  emerald: 'bg-emerald-300 text-black border-black',
  rose: 'bg-rose-300 text-black border-black',
  amber: 'bg-amber-300 text-black border-black',
  sky: 'bg-sky-300 text-black border-black',
  violet: 'bg-violet-300 text-black border-black',
  slate: 'bg-gray-200 text-black border-black',
  blue: 'bg-blue-300 text-black border-black',
};

export function Badge({
  tone = 'slate',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border-2 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: 'active' | 'overdue' | 'closed' }) {
  const map = {
    active: { tone: 'emerald' as Tone, label: 'On track' },
    overdue: { tone: 'rose' as Tone, label: 'Overdue' },
    closed: { tone: 'slate' as Tone, label: 'Closed' },
  };
  const s = map[status];
  return (
    <Badge tone={s.tone}>
      <span
        className={cn(
          'h-2 w-2 rounded-full border border-black',
          status === 'active' ? 'bg-emerald-600' : status === 'overdue' ? 'bg-rose-600' : 'bg-gray-500'
        )}
      />
      {s.label}
    </Badge>
  );
}

/* ------------------------------- ProgressBar ------------------------------ */
export function ProgressBar({
  value,
  tone = 'emerald',
  className,
}: {
  value: number;
  tone?: 'emerald' | 'rose' | 'amber' | 'sky';
  className?: string;
}) {
  const tones = {
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    amber: 'bg-amber-400',
    sky: 'bg-sky-400',
  };
  return (
    <div className={cn('h-3 w-full overflow-hidden rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]', className)}>
      <div
        className={cn('h-full border-r-2 border-black transition-all duration-500', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-black bg-amber-50/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border-2 border-black bg-yellow-300 text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <Icon size={28} className="stroke-[2.5]" />
      </div>
      <h3 className="text-lg font-black text-black uppercase tracking-wide">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm font-semibold text-gray-700">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const palette = [
    'bg-emerald-300 text-black',
    'bg-sky-300 text-black',
    'bg-violet-300 text-black',
    'bg-amber-300 text-black',
    'bg-rose-300 text-black',
    'bg-blue-300 text-black',
  ];
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 border-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        palette[idx],
        className ?? 'h-9 w-9 text-xs'
      )}
    >
      {initials}
    </div>
  );
}
