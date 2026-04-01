// Module-level SSE controller map — persists across API route calls in dev
type SSEController = ReadableStreamDefaultController<Uint8Array>

const streams = new Map<string, SSEController>()

export function registerStream(meetingId: string, controller: SSEController) {
  streams.set(meetingId, controller)
}

export function unregisterStream(meetingId: string) {
  streams.delete(meetingId)
}

export function pushEvent(meetingId: string, event: object) {
  const ctrl = streams.get(meetingId)
  if (!ctrl) return
  try {
    const data = `data: ${JSON.stringify(event)}\n\n`
    ctrl.enqueue(new TextEncoder().encode(data))
  } catch {
    streams.delete(meetingId)
  }
}

export function hasStream(meetingId: string): boolean {
  return streams.has(meetingId)
}
