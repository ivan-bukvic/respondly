import type { InteractionLogWithContext } from '@/lib/responses/transition'

type HistoryLogProps = {
  items: InteractionLogWithContext[]
}

const ACTION_LABEL: Record<InteractionLogWithContext['action'], string> = {
  approved: 'Approved',
  edited_and_sent: 'Edited & sent',
  rejected: 'Rejected',
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function HistoryLog({ items }: HistoryLogProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
        <p className="font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved, edited, and rejected actions will show up here.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {items.map((item) => {
        const patientLabel = item.display_name
          ? `${item.display_name} (${item.whatsapp_number})`
          : item.whatsapp_number

        return (
          <li key={item.id} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {ACTION_LABEL[item.action]}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(item.created_at)}
              </p>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {patientLabel}
            </p>
            {item.message_preview ? (
              <p className="mt-1 line-clamp-2 text-sm">
                {item.message_preview}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
