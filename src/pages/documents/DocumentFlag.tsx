export function DocumentFlag({
  on,
  onLabel,
  offLabel,
}: {
  on: boolean
  onLabel: string
  offLabel: string
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        on ? 'bg-teal-50 text-teal-700' : 'bg-cream-100 text-ink-500'
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  )
}
