import { NextResponse } from 'next/server'
import { z } from 'zod'
import { timingSafeEqual } from '@/lib/auth/timing-safe-equal'
import { insertAppointment } from '@/lib/appointments/queries'

export const runtime = 'nodejs'

const bookAppointmentSchema = z.object({
  name: z.literal('book_appointment'),
  input: z.object({
    conversation_id: z.string().uuid(),
    requested_time: z.string().min(1),
    treatment: z.string().optional(),
  }),
})

function unauthorized() {
  return NextResponse.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing MCP shared secret',
      },
    },
    { status: 401 }
  )
}

// Internal MCP tool endpoint. Called by generate-draft when Claude emits
// a book_appointment tool_use block — not by arbitrary clients.
// Protected by MCP_SHARED_SECRET (see SECURITY.md §5).
export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.MCP_SHARED_SECRET
    if (!expectedSecret) {
      console.error('MCP_SHARED_SECRET is not configured')
      return NextResponse.json(
        {
          error: {
            code: 'MCP_MISCONFIGURED',
            message: 'MCP shared secret is not configured',
          },
        },
        { status: 500 }
      )
    }

    const providedSecret = request.headers.get('x-mcp-secret')
    if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
      return unauthorized()
    }

    const body = await request.json()
    const parsed = bookAppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOOL_PAYLOAD',
            message: 'Invalid book_appointment payload',
          },
        },
        { status: 400 }
      )
    }

    const { conversation_id, requested_time, treatment } = parsed.data.input

    // Require an explicit UTC offset so Date() never treats an offset-less
    // string as server-local time (Phase 4 review fix #3).
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(requested_time.trim())) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOOL_PAYLOAD',
            message:
              'requested_time must include a UTC offset (e.g. 2026-07-17T14:00:00Z)',
          },
        },
        { status: 400 }
      )
    }

    const requestedDate = new Date(requested_time)
    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOOL_PAYLOAD',
            message: 'requested_time must be a valid date-time',
          },
        },
        { status: 400 }
      )
    }

    const appointment = await insertAppointment({
      conversationId: conversation_id,
      requestedTime: requestedDate.toISOString(),
      treatment: treatment ?? null,
    })

    return NextResponse.json({
      ok: true,
      appointment: {
        id: appointment.id,
        conversation_id: appointment.conversation_id,
        requested_time: appointment.requested_time,
        treatment: appointment.treatment,
        status: appointment.status,
      },
      content: `Appointment booked for ${appointment.requested_time}${
        appointment.treatment ? ` (${appointment.treatment})` : ''
      }. Confirmation still requires admin approval before the patient is notified.`,
    })
  } catch (error) {
    console.error('MCP tool error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'MCP_TOOL_ERROR',
          message: 'Failed to execute book_appointment',
        },
      },
      { status: 500 }
    )
  }
}
