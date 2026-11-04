'use client';

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compactInr, money } from '@/lib/format';

/** Validated palette (dataviz validator: all checks pass, light surface). */
export const SERIES = { blue: '#2a78d6', aqua: '#1baf7a', orange: '#eb6834' };

/** Single-series area chart with crosshair tooltip. The card title names the series. */
export function SalesArea({ data: raw, dataKey = 'sales', days = 30 }: { data: { day: string; [k: string]: number | string }[]; dataKey?: string; days?: number }) {
  const data = fillDays(raw, days, dataKey);
  if (!raw.length) return <p className="grid h-64 place-items-center text-sm text-slate-500">No sales in this period yet.</p>;
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div className="h-64" role="img" aria-label={`Daily ${dataKey} chart`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={SERIES.blue} stopOpacity={0.22} />
              <stop offset="1" stopColor={SERIES.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v) => compactInr(Number(v))} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            formatter={(v) => [money(Number(v)), dataKey === 'sales' ? 'Sales' : 'Profit']}
            labelFormatter={(l) => fmtDay(String(l))}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={SERIES.blue} strokeWidth={2} fill="url(#fillSales)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Part-to-whole donut with a labelled legend (identity never by colour alone). */
export function Donut({ parts, centerLabel }: { parts: { label: string; value: number; color: string }[]; centerLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-40 w-40">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={total ? parts : [{ label: 'None', value: 1, color: '#e2e8f0' }]} dataKey="value" nameKey="label" innerRadius={52} outerRadius={72} paddingAngle={total ? 2 : 0} stroke="#fff" strokeWidth={2}>
              {(total ? parts : [{ color: '#e2e8f0' }]).map((p, i) => <Cell key={i} fill={p.color} />)}
            </Pie>
            {total > 0 && <Tooltip formatter={(v, n) => [`${v}`, String(n)]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><div className="text-2xl font-bold text-slate-900">{total.toLocaleString('en-IN')}</div><div className="text-[11px] text-slate-500">{centerLabel}</div></div>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="w-24 text-slate-600">{p.label}</span>
            <span className="font-semibold text-slate-900">{p.value.toLocaleString('en-IN')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal single-series bars with direct value labels. */
export function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[100px_1fr_36px] items-center gap-3 text-sm" title={`${r.label}: ${r.value}`}>
          <span className="truncate text-slate-600">{r.label}</span>
          <span className="h-3 rounded-r bg-slate-100"><span className="block h-3 rounded-r" style={{ width: `${(r.value / max) * 100}%`, background: SERIES.blue }} /></span>
          <span className="text-right font-semibold text-slate-900">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Zero-fills missing days so a sparse series still reads as a trend (YYYY-MM-DD keys, IST). */
function fillDays(rows: { day: string; [k: string]: number | string }[], days: number, key: string) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
  const last = rows.length ? new Date(`${rows[rows.length - 1].day}T12:00:00+05:30`) : new Date();
  const end = Math.max(Date.now(), last.getTime());
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = fmt.format(new Date(end - i * 86400_000));
    out.push(byDay.get(d) ?? { day: d, [key]: 0 });
  }
  return out;
}
