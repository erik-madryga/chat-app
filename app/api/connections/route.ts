import { verifyToken } from '../../../lib/auth'
import { readJSON } from '../../../lib/blobClient'
import { getConnectionSummary } from '../../../lib/connectionClient'
import { listSessionsForUser } from '../../../lib/chatClient'

function safeUser(user: any) {
  if (!user) return null
  return { id: user.id, username: user.username }
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ connectedUsers: [], incomingRequests: [], outgoingRequests: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ connectedUsers: [], incomingRequests: [], outgoingRequests: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const usersById = new Map(users.map((user: any) => [user.id, user]))
  const summary = await getConnectionSummary(payload.userId)
  const sessions = await listSessionsForUser(payload.userId)
  const connectedUserIds = new Set(summary.connectedUserIds)
  for (const session of sessions) {
    for (const participantId of session.participantIds || []) {
      if (participantId !== payload.userId) connectedUserIds.add(participantId)
    }
  }

  const connectedUsers = Array.from(connectedUserIds)
    .map((id) => usersById.get(id))
    .filter(Boolean)
    .map(safeUser)
  const incomingRequests = summary.incomingRequests
    .filter((request) => !connectedUserIds.has(request.fromUserId))
    .map((request) => ({
    ...request,
    fromUser: safeUser(usersById.get(request.fromUserId))
  })).filter((request) => request.fromUser)
  const outgoingRequests = summary.outgoingRequests
    .filter((request) => !connectedUserIds.has(request.toUserId))
    .map((request) => ({
    ...request,
    toUser: safeUser(usersById.get(request.toUserId))
  })).filter((request) => request.toUser)

  return new Response(JSON.stringify({ connectedUsers, incomingRequests, outgoingRequests }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
