import { readJSON } from '../../../lib/blobClient'
import { getUserIdFromRequest } from '../../../lib/auth'
import { getConnectionSummary } from '../../../lib/connectionClient'
import { listSessionsForUser } from '../../../lib/chatClient'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ users: [] }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const summary = await getConnectionSummary(userId)
  const sessions = await listSessionsForUser(userId)
  const connectedUserIds = new Set(summary.connectedUserIds)
  for (const session of sessions) {
    for (const participantId of session.participantIds || []) {
      if (participantId !== userId) connectedUserIds.add(participantId)
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
