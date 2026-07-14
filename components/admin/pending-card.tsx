'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResponseEditor } from '@/components/admin/response-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PendingResponseWithContext } from '@/lib/responses/queries'

type PendingCardProps = {
  item: PendingResponseWithContext
}

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

type ActionError = {
  code: string | null
  message: string
}

type ErrorPresentation = {
  severity: 'sent' | 'not-sent' | 'generic'
  heading: string
  detail: string
  className: string
}

// Distinguishes the two send-failure codes that mean opposite things:
// RESOLVE_AFTER_SEND_FAILED = message already reached the patient (do NOT retry),
// WHATSAPP_SEND_FAILED = nothing was sent (safe to retry). Everything else is
// a generic failure that falls back to the server-provided message.
function presentError(error: ActionError): ErrorPresentation {
  switch (error.code) {
    case 'RESOLVE_AFTER_SEND_FAILED':
      return {
        severity: 'sent',
        heading: 'Message WAS sent to the patient',
        detail:
          'Do not retry. The status could not be updated automatically — refresh and fix the status manually.',
        className:
          'rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-amber-800 dark:text-amber-200',
      }
    case 'WHATSAPP_SEND_FAILED':
      return {
        severity: 'not-sent',
        heading: 'Message was NOT sent',
        detail: 'It is safe to try again.',
        className:
          'rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive',
      }
    default:
      return {
        severity: 'generic',
        heading: error.message,
        detail: '',
        className: 'text-destructive',
      }
  }
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

export function PendingCard({ item }: PendingCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ActionError | null>(null)

  const patientLabel = item.display_name
    ? `${item.display_name} (${item.whatsapp_number})`
    : item.whatsapp_number

  async function postAction(
    path: string,
    body?: { final_text: string }
  ): Promise<boolean> {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: body
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | ApiErrorBody
          | null
        setError({
          code: payload?.error?.code ?? null,
          message:
            payload?.error?.message ?? `Action failed (${response.status})`,
        })
        return false
      }

      router.refresh()
      return true
    } catch {
      setError({ code: null, message: 'Network error — try again' })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    await postAction(`/api/responses/${item.id}/approve`)
  }

  async function handleReject() {
    await postAction(`/api/responses/${item.id}/reject`)
  }

  async function handleEditSave(finalText: string) {
    const ok = await postAction(`/api/responses/${item.id}/edit`, {
      final_text: finalText,
    })
    if (ok) {
      setEditing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{patientLabel}</CardTitle>
            <CardDescription>{formatTimestamp(item.created_at)}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={
                item.sensitivity_tag === 'sensitive' ? 'warning' : 'secondary'
              }
            >
              {item.sensitivity_tag}
            </Badge>
            {item.generation_failed ? (
              <Badge variant="destructive">generation failed</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Inbound
          </p>
          <p className="whitespace-pre-wrap text-sm">{item.inbound_body}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            AI draft
          </p>
          {item.generation_failed ? (
            <p className="mb-2 text-sm text-destructive" role="status">
              Automatic draft failed. Approve is disabled — edit the reply
              manually or reject.
            </p>
          ) : null}
          {editing ? (
            <ResponseEditor
              initialText={item.draft_text}
              disabled={busy}
              onCancel={() => setEditing(false)}
              onSave={handleEditSave}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm">{item.draft_text}</p>
          )}
        </div>
        {error
          ? (() => {
              const presentation = presentError(error)
              if (presentation.severity === 'generic') {
                return (
                  <p
                    className={`text-sm ${presentation.className}`}
                    role="alert"
                  >
                    {presentation.heading}
                  </p>
                )
              }
              return (
                <div className={`text-sm ${presentation.className}`} role="alert">
                  <p className="font-medium">{presentation.heading}</p>
                  <p className="mt-0.5">{presentation.detail}</p>
                </div>
              )
            })()
          : null}
      </CardContent>
      {!editing ? (
        <CardFooter className="gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || item.generation_failed}
            onClick={handleApprove}
            title={
              item.generation_failed
                ? 'Cannot approve a failed draft — edit or reject'
                : undefined
            }
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError(null)
              setEditing(true)
            }}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={handleReject}
          >
            Reject
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
