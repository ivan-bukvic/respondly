import { HistoryLog } from '@/components/admin/history-log'
import { PendingList } from '@/components/admin/pending-list'
import { RefreshButton } from '@/components/admin/refresh-button'
import { LogoutButton } from './logout-button'
import { listPendingResponsesWithContext } from '@/lib/responses/queries'
import { listInteractionLogWithContext } from '@/lib/responses/transition'

// createServiceClient() never touches cookies/headers, so without this
// Next.js statically prerenders /admin at build time and serves stale rows.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPage() {
  const [pending, history] = await Promise.all([
    listPendingResponsesWithContext(),
    listInteractionLogWithContext(),
  ])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-[22px]">
          <div>
            <p className="font-display text-2xl font-medium italic leading-tight text-primary">
              Lumin Aesthetic Clinic
            </p>
            <h1 className="mt-0.5 text-sm font-semibold tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-10 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl italic">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground">
              Review AI drafts before anything reaches the patient.
            </p>
          </div>
          <PendingList items={pending} />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl italic">History Log</h2>
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
