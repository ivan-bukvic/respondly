export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <SkeletonCard />
          <SkeletonCard />
        </section>
        <section className="flex flex-col gap-3">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          <div className="divide-y divide-border rounded-xl border border-border">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </section>
      </main>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex justify-between gap-2">
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-7 w-14 animate-pulse rounded-lg bg-muted" />
        <div className="h-7 w-14 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex justify-between gap-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3 w-36 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
    </div>
  )
}
