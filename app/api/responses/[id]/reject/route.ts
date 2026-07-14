import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { transitionToResponse } from '@/lib/responses/http'
import { rejectPendingResponse } from '@/lib/responses/transition'

export const runtime = 'nodejs'

const idSchema = z.string().uuid()

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Admin session required',
          },
        },
        { status: 401 }
      )
    }

    const { id: rawId } = await context.params
    const parsedId = idSchema.safeParse(rawId)
    if (!parsedId.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ID',
            message: 'pending_response id must be a UUID',
          },
        },
        { status: 400 }
      )
    }

    const actor = user.email ?? user.id
    const result = await rejectPendingResponse(parsedId.data, actor)
    return transitionToResponse(result)
  } catch (error) {
    console.error('Reject response error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'REJECT_FAILED',
          message: 'Failed to reject pending response',
        },
      },
      { status: 500 }
    )
  }
}
