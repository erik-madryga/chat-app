import { getUserIdFromRequest } from '../../../../lib/auth'
import { readJSON } from '../../../../lib/blobClient'
import { getConnectionSummary } from '../../../../lib/connectionClient'
import { listSessionsForUser } from '../../../../lib/chatClient'
import { listEventsForUser } from '../../../../lib/calendarClient'
import type { User } from '../../../../lib/types'

function safeUser(user: any) {
  if (!user) return null
  return { id: user.id, username: user.username }
}

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const encoder = new TextEncoder()
  let lastSessionsDataStr = ''
  let lastConnectionsDataStr = ''
  let lastEventsDataStr = ''

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdates = async () => {
        try {
          const users = (await readJSON('users/users.json')) || []
          const usersById = new Map<string, User>(users.map((u: any) => [u.id, u]))

          // Fetch Data
          const summary = await getConnectionSummary(userId)
          const sessions = await listSessionsForUser(userId)
          const events = await listEventsForUser(userId)

          // 1. Sessions Data
          const sessionsDataStr = JSON.stringify({ sessions })
          if (sessionsDataStr !== lastSessionsDataStr) {
            controller.enqueue(encoder.encode(`event: sessions\ndata: ${sessionsDataStr}\n\n`))
            lastSessionsDataStr = sessionsDataStr
          }

          // 2. Connections Data
          const connectedUserIds = new Set(summary.connectedUserIds)
          for (const session of sessions) {
            for (const participantId of session.participantIds || []) {
              if (participantId !== userId) connectedUserIds.add(participantId)
            }
          }
          const connectedUsers = Array.from(connectedUserIds)
            .map((id) => usersById.get(id))
            .filter(Boolean)
            .map(safeUser)
          const incomingRequests = summary.incomingRequests
            .filter((request: any) => !connectedUserIds.has(request.fromUserId))
            .map((request: any) => ({
              ...request,
              fromUser: safeUser(usersById.get(request.fromUserId))
            })).filter((request: any) => request.fromUser)
          const outgoingRequests = summary.outgoingRequests
            .filter((request: any) => !connectedUserIds.has(request.toUserId))
            .map((request: any) => ({
              ...request,
              toUser: safeUser(usersById.get(request.toUserId))
            })).filter((request: any) => request.toUser)

          const connectionsDataStr = JSON.stringify({ connectedUsers, incomingRequests, outgoingRequests })
          if (connectionsDataStr !== lastConnectionsDataStr) {
            controller.enqueue(encoder.encode(`event: connections\ndata: ${connectionsDataStr}\n\n`))
            lastConnectionsDataStr = connectionsDataStr
          }

          // 3. Events Data
          const enrichedEvents = events.map((event: any) => ({
            ...event,
            attendees: event.attendeeUserIds.map((id: string) => {
              const u = usersById.get(id)
              return { id, username: u?.username || 'Unknown user' }
            }),
            creatorUsername: usersById.get(event.creatorId)?.username || 'Unknown user'
          }))
          const eventsDataStr = JSON.stringify({ events: enrichedEvents })
          if (eventsDataStr !== lastEventsDataStr) {
            controller.enqueue(encoder.encode(`event: events\ndata: ${eventsDataStr}\n\n`))
            lastEventsDataStr = eventsDataStr
          }
        } catch (err) {
          // ignore loop errors to keep stream alive
        }
      }

      await sendUpdates()
      const iv = setInterval(sendUpdates, 500)

      try {
        req.signal.addEventListener('abort', () => {
          clearInterval(iv)
          try { controller.close() } catch (e) {}
        })
      } catch (e) {
        // ignore
      }
    },
    cancel() {
      // noop
    }
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  })
}
