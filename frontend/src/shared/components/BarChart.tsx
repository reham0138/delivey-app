export interface BarChartDatum {
  key: string
  /** Short text under the bar, e.g. the day number. */
  label: string
  value: number
  /** Full description used for the hover tooltip and the screen-reader table, e.g. "Nov 3". */
  description: string
}

interface BarChartProps {
  data: BarChartDatum[]
  formatValue: (value: number) => string
  /** Describes the chart for screen readers. */
  caption: string
  labelHeader: string
  valueHeader: string
}

/**
 * Small dependency-free bar chart made of plain divs.
 * The visual part is hidden from assistive technology and replaced by a real table,
 * so the numbers are available without seeing the bars.
 */
export function BarChart({ data, formatValue, caption, labelHeader, valueHeader }: BarChartProps) {
  const max = Math.max(...data.map((datum) => datum.value), 0)

  return (
    <div>
      <p className="text-xs text-text-slate" aria-hidden="true">
        {formatValue(max)}
      </p>

      {/* dir="ltr": time always runs left to right, even in Arabic */}
      <div aria-hidden="true" dir="ltr" className="mt-1 flex h-44 items-end gap-1 border-b border-border-subtle sm:gap-2">
        {data.map((datum) => (
          <div
            key={datum.key}
            title={`${datum.description}: ${formatValue(datum.value)}`}
            className="flex h-full min-w-0 flex-1 items-end rounded-t bg-surface-cream"
          >
            <div
              className="w-full rounded-t bg-brand-red"
              style={{ height: datum.value > 0 && max > 0 ? `${Math.max((datum.value / max) * 100, 4)}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div aria-hidden="true" dir="ltr" className="mt-1 flex gap-1 text-[10px] text-text-slate sm:gap-2">
        {data.map((datum) => (
          <span key={datum.key} className="min-w-0 flex-1 truncate text-center">
            {datum.label}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labelHeader}</th>
            <th scope="col">{valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.key}>
              <th scope="row">{datum.description}</th>
              <td>{formatValue(datum.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
