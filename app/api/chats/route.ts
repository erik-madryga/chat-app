import { readJSON } from '../../../lib/blobClient'
import { verifyToken } from '../../../lib/auth'
import { createSession, listSessionsForUser } from '../../../lib/chatClient'
import { getConnectionStatus } from '../../../lib/connectionClient'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ sessions: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ sessions: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const sessions = await listSessionsForUser(payload.userId)
  return new Response(JSON.stringify({ sessions }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const participantUsernames: string[] = body?.participantUsernames || []
  const groupName: string | undefined = body?.groupName

  if (!participantUsernames || participantUsernames.length === 0) return new Response(JSON.stringify({ message: 'No participants' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  // resolve usernames to ids
  const users = (await readJSON('users/users.json')) || []
  const ids = [] as string[]
  for (const uname of participantUsernames) {
    const found = users.find((u: any) => u.username.toLowerCase() === String(uname).toLowerCase())
    if (found) ids.push(found.id)
  }

  const existingSessions = await listSessionsForUser(payload.userId)
  for (const id of ids) {
    if (id === payload.userId) continue
    const status = await getConnectionStatus(payload.userId, id)
    const hasExistingChat = existingSessions.some((session: any) => (session.participantIds || []).includes(id))
    if (status !== 'connected' && !hasExistingChat) {
      return new Response(JSON.stringify({ message: 'You can only chat with connected users' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // ensure the creator is included
  if (!ids.includes(payload.userId)) ids.push(payload.userId)

  const session = await createSession(ids, groupName)
  return new Response(JSON.stringify({ session }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}
