import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/require-admin'
import { transitionToResponse } from '@/lib/responses/http'
import { editAndSendPendingResponse } from '@/lib/responses/transition'

export const runtime = 'nodejs'

const idSchema = z.string().uuid()
const editBodySchema = z.object({
  final_text: z.string().trim().min(1),
})

export async function POST(
  request: Request,
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_BODY',
            message: 'Request body must be JSON',
          },
        },
        { status: 400 }
      )
    }

    const parsedBody = editBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_BODY',
            message: 'final_text is required and must be non-empty',
          },
        },
        { status: 400 }
      )
    }

    const actor = user.email ?? user.id
    const result = await editAndSendPendingResponse(
      parsedId.data,
      actor,
      parsedBody.data.final_text
    )
    return transitionToResponse(result)
  } catch (error) {
    console.error('Edit response error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'EDIT_FAILED',
          message: 'Failed to edit and send pending response',
        },
      },
      { status: 500 }
    )
  }
}
