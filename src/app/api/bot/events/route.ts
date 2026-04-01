import { NextRequest } from 'next/server'
import { registerStream, unregisterStream } from '@/lib/sse-manager'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get('meetingId')
  if (!meetingId) {
    return new Response('meetingId required', { status: 400 })
  }

  let pingInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      registerStream(meetingId, controller)
      // Keep-alive ping every 15 seconds
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'))
        } catch {
          if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
        }
      }, 15000)
    },
    cancel() {
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null }
      unregisterStream(meetingId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
