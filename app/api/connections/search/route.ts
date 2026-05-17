import { getUserIdFromRequest } from '../../../../lib/auth'
import { readJSON } from '../../../../lib/blobClient'
import { getConnectionStatus } from '../../../../lib/connectionClient'
import { listSessionsForUser } from '../../../../lib/chatClient'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const url = new URL(req.url)
  const query = (url.searchParams.get('q') || '').trim().toLowerCase()
  if (query.length < 2) return new Response(JSON.stringify({ users: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const sessions = await listSessionsForUser(userId)
  const legacyConnectedUserIds = new Set<string>()
  for (const session of sessions) {
    for (const participantId of session.participantIds || []) {
      if (participantId !== userId) legacyConnectedUserIds.add(participantId)
    }
  }
  const matches = users
    .filter((user: any) => user.id !== userId)
    .filter((user: any) => user.username.toLowerCase().includes(query))
    .slice(0, 10)

  const results = await Promise.all(matches.map(async (user: any) => ({
    id: user.id,
    username: user.username,
    connectionStatus: legacyConnectedUserIds.has(user.id) ? 'connected' : await getConnectionStatus(userId, user.id)
  })))

  return new Response(JSON.stringify({ users: results }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
