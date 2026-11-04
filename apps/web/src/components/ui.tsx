import clsx from 'clsx';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { Icon, IconName } from './icons';

export const cx = clsx;

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-danger text-white hover:bg-red-700',
  success: 'bg-success text-white hover:bg-green-700',
};

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...p}
    />
  );
}

export function ButtonLink({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx('inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition', variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-2xl border border-slate-200/80 bg-white shadow-card', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const control = 'block w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand';
export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input className={cx(control, 'h-10', className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<'select'>) => <select className={cx(control, 'h-10 pr-8', className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<'textarea'>) => <textarea className={cx(control, 'py-2', className)} rows={3} {...p} />;

const tones = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-brand-50 text-brand-700 ring-brand-100',
};
export type Tone = keyof typeof tones;
export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-transparent', tones[tone], className)}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  RECEIVED: 'slate', DIAGNOSING: 'blue', WAITING_FOR_APPROVAL: 'amber', WAITING_FOR_PARTS: 'amber', IN_PROGRESS: 'violet', QUALITY_CHECK: 'blue', READY: 'green', DELIVERED: 'slate', CANCELLED: 'red',
  NEW: 'blue', PENDING_CONFIRMATION: 'amber', CONFIRMED: 'green', RESCHEDULED: 'amber', COMPLETED: 'slate', NO_SHOW: 'red',
  PAID: 'green', PARTIAL: 'amber', UNPAID: 'red', ISSUED: 'blue',
  PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', ACTIVE: 'green', SUSPENDED: 'red', EXPIRED: 'slate', TRIALING: 'blue',
  VERIFIED: 'green', FAILED: 'red', PUBLISHED: 'green', DRAFT: 'slate', UNPUBLISHED: 'slate',
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'slate'}>{status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</Badge>;
}

export function Stat({ icon, label, value, sub, tone = 'blue' }: { icon: IconName; label: string; value: ReactNode; sub?: ReactNode; tone?: 'blue' | 'violet' | 'amber' | 'green' | 'rose' }) {
  const t = { blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600', rose: 'bg-rose-50 text-rose-600' }[tone];
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card">
      <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t)}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xl font-semibold tracking-tight text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
        {sub && <div className="mt-0.5 text-xs font-medium text-success">{sub}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ icon = 'box', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <Icon name={icon} />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cx('whitespace-nowrap px-5 py-3 text-slate-700', className)}>{children}</td>;

export function Alert({ tone = 'red', children }: { tone?: 'red' | 'green' | 'blue'; children: ReactNode }) {
  const t = { red: 'bg-red-50 text-red-800 ring-red-200', green: 'bg-green-50 text-green-800 ring-green-200', blue: 'bg-blue-50 text-blue-800 ring-blue-200' }[tone];
  return <div role={tone === 'red' ? 'alert' : 'status'} className={cx('rounded-lg px-3 py-2 text-sm ring-1 ring-inset', t)}>{children}</div>;
}
