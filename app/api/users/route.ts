import { readJSON } from '../../../lib/blobClient'
import { verifyToken } from '../../../lib/auth'
import { getConnectionSummary } from '../../../lib/connectionClient'
import { listSessionsForUser } from '../../../lib/chatClient'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const summary = await getConnectionSummary(payload.userId)
  const sessions = await listSessionsForUser(payload.userId)
  const connectedUserIds = new Set(summary.connectedUserIds)
  for (const session of sessions) {
    for (const participantId of session.participantIds || []) {
      if (participantId !== payload.userId) connectedUserIds.add(participantId)
    }
  }

  const safeUsers = users
    .filter((user: any) => connectedUserIds.has(user.id))
    .map((user: any) => ({
      id: user.id,
      username: user.username
    }))

  return new Response(JSON.stringify({ users: safeUsers }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
