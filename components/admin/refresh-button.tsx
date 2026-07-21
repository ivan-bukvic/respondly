'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [clicked, setClicked] = useState(false)

  function handleRefresh() {
    setClicked(true)
    startTransition(() => {
      router.refresh()
      setClicked(false)
    })
  }

  const loading = isPending || clicked

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={handleRefresh}
    >
      {loading ? 'Refreshing...' : 'Refresh'}
    </Button>
  )
}
