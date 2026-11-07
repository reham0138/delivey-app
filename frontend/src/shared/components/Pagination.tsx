import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'
import { useLanguage } from '../hooks/useLanguage'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t, direction } = useLanguage()

  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  return (
    <nav
      aria-label={t('Pagination')}
      dir={direction}
      className="flex flex-wrap items-center justify-center gap-2 pt-5"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className="inline-flex min-w-24 items-center justify-center gap-2"
      >
        {direction === 'rtl' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        {t('Previous')}
      </Button>
      <div className="flex items-center gap-1.5" dir="ltr">
        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            variant={currentPage === page ? 'primary' : 'outline'}
            aria-current={currentPage === page ? 'page' : undefined}
            aria-label={t('Go to page {page}', { page })}
            onClick={() => onPageChange(page)}
            className="min-w-9 tabular-nums"
          >
            {page}
          </Button>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className="inline-flex min-w-24 items-center justify-center gap-2"
      >
        {t('Next')}
        {direction === 'rtl' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </Button>
    </nav>
  )
}
