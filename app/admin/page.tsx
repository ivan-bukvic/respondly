import { HistoryLog } from '@/components/admin/history-log'
import { PendingList } from '@/components/admin/pending-list'
import { RefreshButton } from '@/components/admin/refresh-button'
import { LogoutButton } from './logout-button'
import { listPendingResponsesWithContext } from '@/lib/responses/queries'
import { listInteractionLogWithContext } from '@/lib/responses/transition'

export default async function AdminPage() {
  const [pending, history] = await Promise.all([
    listPendingResponsesWithContext(),
    listInteractionLogWithContext(),
  ])

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Lumin Aesthetic Clinic
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-medium">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground">
              Review AI drafts before anything reaches the patient.
            </p>
          </div>
          <PendingList items={pending} />
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-medium">History Log</h2>
            <p className="text-sm text-muted-foreground">
              Recent approve, edit, and reject actions.
            </p>
          </div>
          <HistoryLog items={history} />
        </section>
      </main>
    </div>
  )
}
