import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import { useChartColors } from './theme';
import { fmtShort, fmtMonth } from '@/lib/date';
import { num, won, wonShort } from '@/lib/format';

const axis = (c: ReturnType<typeof useChartColors>) => ({
  tick: { fill: c.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
});

function Frame({ height = 220, children }: { height?: number; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height }} className="num">
      <ResponsiveContainer>{children as never}</ResponsiveContainer>
    </div>
  );
}

function Tip({ active, payload, label, fmtLabel, fmtValue }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmtLabel: (l: string) => string; fmtValue: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtLabel(String(label))}</p>
      {payload.map((p) => (
        <p key={p.name} className="num flex items-center gap-2 text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name} <span className="ml-auto pl-3 font-medium text-ink">{fmtValue(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

const legendStyle = { fontSize: 12, paddingTop: 4 };

export function WeightChart({ data, target, height }: { data: { date: string; kg: number; avg7: number }[]; target: number; height?: number }) {
  const c = useChartColors();
  const lo = Math.min(target, ...data.map((d) => d.kg)) - 1;
  const hi = Math.max(...data.map((d) => d.kg)) + 1;
  return (
    <Frame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmtShort} {...axis(c)} minTickGap={24} />
        <YAxis domain={[Math.floor(lo), Math.ceil(hi)]} {...axis(c)} width={44} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<Tip fmtLabel={(l) => l.replaceAll('-', '.')} fmtValue={(v) => `${num(v, 1)}kg`} />} />
        <Legend wrapperStyle={legendStyle} iconType="plainline" />
        <ReferenceLine y={target} stroke={c.success} strokeDasharray="4 4" label={{ value: `목표 ${target}kg`, fill: c.muted, fontSize: 11, position: 'insideBottomRight' }} />
        <Line name="일별 기록" dataKey="kg" stroke={c.soft} strokeWidth={1.5} dot={{ r: 3, fill: c.surface, stroke: c.accent, strokeWidth: 1.5 }} isAnimationActive={false} />
        <Line name="7일 평균" dataKey="avg7" stroke={c.ink} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

export function DebtChart({ data, height, plan }: { data: { month: string; total?: number; plan?: number }[]; height?: number; plan?: boolean }) {
  const c = useChartColors();
  return (
    <Frame height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={(m) => `${Number(String(m).slice(5))}월`} {...axis(c)} minTickGap={8} />
        <YAxis tickFormatter={wonShort} {...axis(c)} width={52} />
        <Tooltip content={<Tip fmtLabel={fmtMonth} fmtValue={won} />} />
        {plan && <Legend wrapperStyle={legendStyle} iconType="plainline" />}
        {plan && <Area name="계획(시뮬레이션)" dataKey="plan" stroke={c.accent} strokeDasharray="5 4" strokeWidth={2} fill="none" isAnimationActive={false} connectNulls />}
        <Area name="실제 잔액" dataKey="total" stroke={c.ink} strokeWidth={2} fill={c.ink} fillOpacity={0.06} isAnimationActive={false} connectNulls />
      </AreaChart>
    </Frame>
  );
}

export function RateBars({ data, height, xKey, xFmt }: { data: Record<string, unknown>[]; height?: number; xKey: string; xFmt: (v: string) => string }) {
  const c = useChartColors();
  return (
    <Frame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFmt} {...axis(c)} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...axis(c)} width={44} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<Tip fmtLabel={xFmt} fmtValue={(v) => `${Math.round(v)}%`} />} />
        <Bar name="달성률" dataKey="pct" fill={c.ink} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function StackBars({ data, series, xKey, xFmt, height, yFmt = (v: number) => String(v), valueFmt }: { data: Record<string, unknown>[]; series: { key: string; name: string; color: 'ink' | 'accent' | 'soft' }[]; xKey: string; xFmt: (v: string) => string; height?: number; yFmt?: (v: number) => string; valueFmt?: (v: number) => string }) {
  const c = useChartColors();
  return (
    <Frame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFmt} {...axis(c)} />
        <YAxis allowDecimals={false} tickFormatter={yFmt} {...axis(c)} width={48} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<Tip fmtLabel={xFmt} fmtValue={valueFmt ?? ((v) => String(v))} />} />
        <Legend wrapperStyle={legendStyle} iconType="square" />
        {series.map((s, i) => (
          <Bar key={s.key} name={s.name} dataKey={s.key} stackId="a" fill={c[s.color]} stroke={c.surface} strokeWidth={1} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={32} isAnimationActive={false} />
        ))}
      </BarChart>
    </Frame>
  );
}

export function GroupBars({ data, series, xKey, xFmt, height }: { data: Record<string, unknown>[]; series: { key: string; name: string; color: 'ink' | 'accent' | 'soft' }[]; xKey: string; xFmt: (v: string) => string; height?: number }) {
  const c = useChartColors();
  return (
    <Frame height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFmt} {...axis(c)} />
        <YAxis tickFormatter={wonShort} {...axis(c)} width={52} />
        <Tooltip cursor={{ fill: c.grid, opacity: 0.4 }} content={<Tip fmtLabel={xFmt} fmtValue={won} />} />
        <Legend wrapperStyle={legendStyle} iconType="square" />
        <ReferenceLine y={0} stroke={c.muted} />
        {series.map((s) => (
          <Bar key={s.key} name={s.name} dataKey={s.key} fill={c[s.color]} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        ))}
      </BarChart>
    </Frame>
  );
}

export function SimpleLine({ data, xKey, yKey, name, xFmt, domain, height, yFmt = (v: number) => String(v) }: { data: Record<string, unknown>[]; xKey: string; yKey: string; name: string; xFmt: (v: string) => string; domain?: [number, number]; height?: number; yFmt?: (v: number) => string }) {
  const c = useChartColors();
  return (
    <Frame height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFmt} {...axis(c)} minTickGap={12} />
        <YAxis domain={domain ?? ['auto', 'auto']} tickFormatter={yFmt} {...axis(c)} width={44} />
        <Tooltip content={<Tip fmtLabel={xFmt} fmtValue={(v) => yFmt(Math.round(v * 10) / 10)} />} />
        <Line name={name} dataKey={yKey} stroke={c.ink} strokeWidth={2} dot={{ r: 4, fill: c.surface, stroke: c.ink, strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}
