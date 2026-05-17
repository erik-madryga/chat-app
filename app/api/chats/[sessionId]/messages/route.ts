import { getUserIdFromRequest } from '../../../../../lib/auth'
import { getSession, getMessages, postMessage } from '../../../../../lib/chatClient'

type RouteContext = {
  params: Promise<{ sessionId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const { sessionId } = await context.params
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const session = await getSession(sessionId)
  if (!session) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  if (!session.participantIds.includes(userId)) return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })

  const url = new URL(req.url)
  const requestedLimit = Number(url.searchParams.get('limit') || '50')
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50
  const before = url.searchParams.get('before') || undefined

  const messages = await getMessages(sessionId, limit, before)
  return new Response(JSON.stringify({ messages }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request, context: RouteContext) {
  const { sessionId } = await context.params
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const session = await getSession(sessionId)
  if (!session) return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  if (!session.participantIds.includes(userId)) return new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const content = String(body?.content || '').trim()
  if (!content) return new Response(JSON.stringify({ message: 'No content' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (content.length > 4000) return new Response(JSON.stringify({ message: 'Message is too long' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const message = await postMessage(sessionId, userId, content)
  return new Response(JSON.stringify({ message }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}
