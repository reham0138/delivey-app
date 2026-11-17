import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Makes this cell the row's header for screen readers (use it for the main column, e.g. the name). */
  rowHeader?: boolean
  className?: string
}

interface DataTableProps<T> {
  /** Describes the table for screen readers. */
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
}

export function DataTable<T>({ caption, columns, rows, getRowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border-subtle text-xs text-text-slate">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="py-2 pe-3 text-start font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) =>
                column.rowHeader ? (
                  <th key={column.key} scope="row" className={`py-3 pe-3 text-start font-medium ${column.className ?? ''}`}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={column.key} className={`py-3 pe-3 ${column.className ?? ''}`}>
                    {column.cell(row)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}