'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Pagination from '@/components/ui/Pagination'

export default function UrlPagination({
  page, totalPages, total, pageSize, itemLabel,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  itemLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onPageChange(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (p <= 1) params.delete('page')
    else params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={onPageChange}
      itemLabel={itemLabel}
    />
  )
}
