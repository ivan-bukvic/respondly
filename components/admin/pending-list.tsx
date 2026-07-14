import { PendingCard } from '@/components/admin/pending-card'
import type { PendingResponseWithContext } from '@/lib/responses/queries'

type PendingListProps = {
  items: PendingResponseWithContext[]
}

export function PendingList({ items }: PendingListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-medium">No pending responses</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New WhatsApp messages will appear here for approval.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <PendingCard key={item.id} item={item} />
      ))}
    </div>
  )
}
