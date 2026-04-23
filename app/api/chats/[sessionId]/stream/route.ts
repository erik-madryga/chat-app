import { getSession, getMessages } from '../../../../../lib/chatClient'
import { verifyToken } from '../../../../../lib/auth'

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const session = await getSession(sessionId)
  if (!session) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  if (!session.participantIds.includes(payload.userId)) return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })

  const encoder = new TextEncoder()
  let lastTimestamp: string | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const sendNew = async () => {
        try {
          const msgs = await getMessages(sessionId, 1000)
          for (const m of msgs) {
            if (!lastTimestamp || new Date(m.timestamp).getTime() > new Date(lastTimestamp).getTime()) {
              const payload = `event: message\n` + `data: ${JSON.stringify(m)}\n\n`
              controller.enqueue(encoder.encode(payload))
              lastTimestamp = m.timestamp
            }
          }
        } catch (err) {
          // ignore
        }
      }

      await sendNew()
      const iv = setInterval(sendNew, 1000)
      try {
        req.signal.addEventListener('abort', () => {
          clearInterval(iv)
          try { controller.close() } catch (e) {}
        })
      } catch (e) {
        // ignore if no signal
      }
    },
    cancel() {
      // noop
    }
  })

  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive' } })
}
