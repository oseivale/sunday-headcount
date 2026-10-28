type Series = { name: string; color: string; values: number[] }
type Cat = { label: string; title: string }

function niceStep(range: number, parts = 4) {
  const raw = range / parts
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const m = raw / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p
}

/** Stacked columns, drawn to scale with a light grid. Used for weekly attendance and monthly offerings. */
export function StackedChart({ cats, series, unit = '', totals = false, height = 230 }: { cats: Cat[]; series: Series[]; unit?: string; totals?: boolean; height?: number }) {
  const W = 680
  const H = height
  const L = 44
  const R = 12
  const T = totals ? 22 : 12
  const B = 28
  const sums = cats.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0))
  const max = Math.max(1, ...sums)
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const bw = (W - L - R) / Math.max(1, cats.length)
  const gap = Math.min(6, bw * 0.25)
  const y = (v: number) => T + (1 - v / top) * (H - T - B)
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(', ')}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end">{unit}{Math.round(v)}</text>
        </g>
      ))}
      {cats.map((c, i) => {
        const x = L + i * bw + gap / 2
        const w = bw - gap
        let acc = 0
        return (
          <g key={i}>
            {series.map((s) => {
              const v = s.values[i] || 0
              const y0 = y(acc)
              acc += v
              return v > 0 ? (
                <rect key={s.name} x={x} y={y(acc)} width={w} height={y0 - y(acc)} fill={s.color}>
                  <title>{`${c.title}: ${s.name} ${unit}${Math.round(v)}`}</title>
                </rect>
              ) : null
            })}
            {totals && sums[i] > 0 && (
              <text x={x + w / 2} y={y(sums[i]) - 6} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 700 }}>{unit}{Math.round(sums[i])}</text>
            )}
            {c.label && <text x={x + w / 2} y={H - 10} textAnchor="middle">{c.label}</text>}
          </g>
        )
      })}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--muted)" />
    </svg>
  )
}
