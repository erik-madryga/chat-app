import { verifyToken } from '../../../../lib/auth'
import { readJSON } from '../../../../lib/blobClient'
import { getConnectionStatus } from '../../../../lib/connectionClient'
import { listSessionsForUser } from '../../../../lib/chatClient'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const url = new URL(req.url)
  const query = (url.searchParams.get('q') || '').trim().toLowerCase()
  if (query.length < 2) return new Response(JSON.stringify({ users: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const sessions = await listSessionsForUser(payload.userId)
  const legacyConnectedUserIds = new Set<string>()
  for (const session of sessions) {
    for (const participantId of session.participantIds || []) {
      if (participantId !== payload.userId) legacyConnectedUserIds.add(participantId)
    }
  }
  const matches = users
    .filter((user: any) => user.id !== payload.userId)
    .filter((user: any) => user.username.toLowerCase().includes(query))
    .slice(0, 10)

  const results = await Promise.all(matches.map(async (user: any) => ({
    id: user.id,
    username: user.username,
    connectionStatus: legacyConnectedUserIds.has(user.id) ? 'connected' : await getConnectionStatus(payload.userId, user.id)
  })))

  return new Response(JSON.stringify({ users: results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
