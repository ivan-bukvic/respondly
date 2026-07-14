import { NextResponse } from 'next/server'
import type { TransitionResult } from '@/lib/responses/transition'

export function transitionToResponse(result: TransitionResult) {
  if (result.ok) {
    return NextResponse.json({
      pending_response_id: result.pending.id,
      status: result.pending.status,
    })
  }

  const statusByCode = {
    NOT_FOUND: 404,
    INVALID_STATE_TRANSITION: 409,
    GENERATION_FAILED_APPROVE_BLOCKED: 409,
    GENERATION_FAILED_REQUIRES_EDIT: 409,
    WHATSAPP_SEND_FAILED: 502,
    RESOLVE_AFTER_SEND_FAILED: 500,
  } as const

  return NextResponse.json(
    {
      error: {
        code: result.code,
        message: result.message,
      },
    },
    { status: statusByCode[result.code] }
  )
}
