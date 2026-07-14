import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { transitionToResponse } from '@/lib/responses/http'
import { approvePendingResponse } from '@/lib/responses/transition'

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
    const result = await approvePendingResponse(parsedId.data, actor)
    return transitionToResponse(result)
  } catch (error) {
    console.error('Approve response error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'APPROVE_FAILED',
          message: 'Failed to approve pending response',
        },
      },
      { status: 500 }
    )
  }
}
