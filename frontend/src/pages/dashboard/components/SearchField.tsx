import { Search } from 'lucide-react'
import { useId } from 'react'

interface SearchFieldProps {
  /** Read by screen readers; the placeholder is only a hint. */
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchField({ label, value, onChange, placeholder, className = '' }: SearchFieldProps) {
  const id = useId()
  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        size={18}
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-slate"
      />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border-subtle bg-surface-white py-2 pe-3 ps-10 text-text-main"
      />
    </div>
  )
}