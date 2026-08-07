import { NextResponse } from 'next/server'
import { timingSafeEqual } from '@/lib/auth/timing-safe-equal'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function unauthorized() {
  return NextResponse.json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing cron secret',
      },
    },
    { status: 401 }
  )
}

// Daily ping so Supabase free-plan projects do not auto-pause after
// 7 days of inactivity. Protected by CRON_SECRET (Vercel Cron sends
// Authorization: Bearer <CRON_SECRET>).
export async function GET(request: Request) {
  try {
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      console.error('CRON_SECRET is not configured')
      return unauthorized()
    }

    const header = request.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) {
      return unauthorized()
    }

    const providedSecret = header.slice(7)
    if (!timingSafeEqual(providedSecret, expectedSecret)) {
      return unauthorized()
    }

    const supabase = await createServiceClient()
    const { error } = await supabase.from('faq_documents').select('id').limit(1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron keep-alive error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'CRON_KEEP_ALIVE_FAILED',
          message: 'Failed to run keep-alive query',
        },
      },
      { status: 500 }
    )
  }
}
