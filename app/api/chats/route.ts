import { readJSON } from '../../../lib/blobClient'
import { getUserIdFromRequest } from '../../../lib/auth'
import { createSession, listSessionsForUser } from '../../../lib/chatClient'
import { getConnectionStatus } from '../../../lib/connectionClient'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ sessions: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const sessions = await listSessionsForUser(userId)
  return new Response(JSON.stringify({ sessions }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const participantUsernames = Array.isArray(body?.participantUsernames)
    ? body.participantUsernames.map((item: any) => String(item || '').trim()).filter(Boolean)
    : []
  const groupName = typeof body?.groupName === 'string' ? body.groupName.trim().slice(0, 80) : undefined

  if (!participantUsernames || participantUsernames.length === 0) return new Response(JSON.stringify({ message: 'No participants' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (participantUsernames.length > 20) return new Response(JSON.stringify({ message: 'Too many participants' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  // resolve usernames to ids
  const users = (await readJSON('users/users.json')) || []
  const ids = [] as string[]
  for (const uname of participantUsernames) {
    const found = users.find((u: any) => u.username.toLowerCase() === String(uname).toLowerCase())
    if (found) ids.push(found.id)
  }

  const existingSessions = await listSessionsForUser(userId)
  for (const id of ids) {
    if (id === userId) continue
    const status = await getConnectionStatus(userId, id)
    const hasExistingChat = existingSessions.some((session: any) => (session.participantIds || []).includes(id))
    if (status !== 'connected' && !hasExistingChat) {
      return new Response(JSON.stringify({ message: 'You can only chat with connected users' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // ensure the creator is included
  if (!ids.includes(userId)) ids.push(userId)

  const session = await createSession(ids, groupName)
  return new Response(JSON.stringify({ session }), { status: 201, headers: { 'Content-Type': 'application/json' } })
}
