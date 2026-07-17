'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatBDT } from '@/lib/format'
import type { CategorySlice, DayPoint } from '../_lib/analytics'

/**
 * The charts standard (§34): every chart on the admin pulls its colours from the design tokens at
 * runtime — no hardcoded hex — so a token change (or a future dark theme) repaints the charts with
 * the rest of the system. Recharts draws SVG attributes, which can't read `var()` directly, so we
 * resolve the custom properties once on mount.
 */
function useTokenColors() {
  const [colors, setColors] = React.useState({
    brand: '#d7346b',
    accent: '#b98a00',
    info: '#0d6cbd',
    success: '#0d7a43',
    ink: '#181b20',
    muted: '#656970',
    line: '#e5e6ea',
  })

  React.useEffect(() => {
    const styles = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback
    setColors({
      brand: read('--color-brand-500', '#d7346b'),
      accent: read('--color-accent-600', '#b98a00'),
      info: read('--color-info', '#0d6cbd'),
      success: read('--color-success', '#0d7a43'),
      ink: read('--color-ink', '#181b20'),
      muted: read('--color-ink-muted', '#656970'),
      line: read('--color-line', '#e5e6ea'),
    })
  }, [])

  return colors
}

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid var(--color-line)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  fontSize: 12,
  boxShadow: '0 4px 16px rgb(0 0 0 / 0.08)',
}

/* ---------------------------------- Sparkline --------------------------------- */

export function Sparkline({ data, positive = true }: { data: number[]; positive?: boolean }) {
  const colors = useTokenColors()
  const stroke = positive ? colors.success : colors.brand
  const points = data.map((value, i) => ({ i, value }))

  if (data.length < 2) return null

  return (
    <div className="h-9 w-20" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            fill={`url(#spark-${positive ? 'up' : 'down'})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* --------------------------------- Revenue area -------------------------------- */

export function RevenueAreaChart({ series }: { series: DayPoint[] }) {
  const colors = useTokenColors()

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.brand} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={{ stroke: colors.line }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [formatBDT(Number(value)), 'Sales']}
            labelStyle={{ color: 'var(--color-ink-muted)', fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke={colors.brand}
            strokeWidth={2}
            fill="url(#revenue-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------- Orders bar --------------------------------- */

export function OrdersBarChart({ series }: { series: DayPoint[] }) {
  const colors = useTokenColors()

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={{ stroke: colors.line }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.muted }}
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [String(value), 'Orders']}
            labelStyle={{ color: 'var(--color-ink-muted)', fontWeight: 600 }}
          />
          <Bar dataKey="orders" fill={colors.info} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* --------------------------------- Category donut ------------------------------ */

export function CategoryDonut({ slices }: { slices: CategorySlice[] }) {
  const colors = useTokenColors()
  // A fixed rotation through the semantic tokens — distinct, on-system, theme-aware.
  const palette = [colors.brand, colors.info, colors.accent, colors.success, colors.muted, colors.ink]

  const total = slices.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {slices.map((slice, i) => (
                <Cell key={slice.name} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [formatBDT(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {slices.map((slice, i) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0
          return (
            <li key={slice.name} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{slice.name}</span>
              <span className="text-xs text-ink-muted tabular-nums">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
