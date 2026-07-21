import type { InteractionLogWithContext } from '@/lib/responses/transition'

type HistoryLogProps = {
  items: InteractionLogWithContext[]
}

const ACTION_LABEL: Record<InteractionLogWithContext['action'], string> = {
  approved: 'Approved',
  edited_and_sent: 'Edited & sent',
  rejected: 'Rejected',
}

const ACTION_COLOR: Record<
  InteractionLogWithContext['action'],
  { dot: string; label: string }
> = {
  approved: { dot: 'bg-emerald-500', label: 'text-emerald-600' },
  edited_and_sent: { dot: 'bg-primary', label: 'text-primary' },
  rejected: { dot: 'bg-destructive', label: 'text-destructive' },
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
      <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center shadow-sm shadow-black/5">
        <p className="font-medium">No activity yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Approved, edited, and rejected actions will show up here.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[0_6px_20px_-12px_oklch(0.145_0_0/0.12)]">
      {items.map((item) => {
        const patientLabel = item.display_name
          ? `${item.display_name} (${item.whatsapp_number})`
          : item.whatsapp_number
        const actionColor = ACTION_COLOR[item.action]

        return (
          <li key={item.id} className="flex gap-3 px-5 py-4">
            <span
              aria-hidden
              className={`mt-1.5 size-2 shrink-0 rounded-full ${actionColor.dot}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${actionColor.label}`}>
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
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed">
                  {item.message_preview}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
