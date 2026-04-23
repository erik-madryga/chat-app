import { verifyToken } from '../../../../../lib/auth'
import { getSession, getMessages, postMessage } from '../../../../../lib/chatClient'

export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') || '50')
  const before = url.searchParams.get('before') || undefined

  const messages = await getMessages(sessionId, limit, before)
  return new Response(JSON.stringify({ messages }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
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

  const body = await req.json()
  const content = body?.content
  if (!content) return new Response(JSON.stringify({ message: 'No content' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const message = await postMessage(sessionId, payload.userId, content)
  return new Response(JSON.stringify({ message }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}
