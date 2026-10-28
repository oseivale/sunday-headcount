export function Delta({ p, suffix = '' }: { p: number | null; suffix?: string }) {
  if (p === null || !isFinite(p)) return <span className="flat">No earlier data</span>
  const r = Math.round(p)
  const cls = r > 0 ? 'up' : r < 0 ? 'down' : 'flat'
  return (
    <>
      <span className={`delta ${cls}`}>{r > 0 ? '▲' : r < 0 ? '▼' : '■'} {Math.abs(r)}%</span>
      <span className="flat"> {suffix}</span>
    </>
  )
}
