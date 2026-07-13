import { LogoutButton } from './logout-button'

export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">Coming in Phase 3</p>
      </div>
      <LogoutButton />
    </div>
  )
}
