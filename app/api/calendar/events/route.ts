import { getUserIdFromRequest } from '../../../../lib/auth'
import { readJSON } from '../../../../lib/blobClient'
import { createEvent, listEventsForUser, updateEventGoogleSync } from '../../../../lib/calendarClient'
import { createGoogleCalendarEvent } from '../../../../lib/googleCalendarClient'
import { getConnectionSummary } from '../../../../lib/connectionClient'
import type { User } from '../../../../lib/types'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ events: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const events = await listEventsForUser(userId)

  // Enrich events with attendee usernames
  const users = (await readJSON('users/users.json')) || []
  const usersById = new Map<string, User>(users.map((u: any) => [u.id, u]))

  const enrichedEvents = events.map((event) => ({
    ...event,
    attendees: event.attendeeUserIds.map((id) => {
      const u = usersById.get(id)
      return { id, username: u?.username || 'Unknown user' }
    }),
    creatorUsername: usersById.get(event.creatorId)?.username || 'Unknown user'
  }))

  return new Response(JSON.stringify({ events: enrichedEvents }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ message: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { title, description, startDateTime, endDateTime, attendeeUserIds } = body

  // Validate title
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return new Response(JSON.stringify({ message: 'Title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  if (title.length > 200) {
    return new Response(JSON.stringify({ message: 'Title must be 200 characters or fewer' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate dates
  const startDate = new Date(startDateTime)
  const endDate = new Date(endDateTime)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response(JSON.stringify({ message: 'Invalid date/time values' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return new Response(JSON.stringify({ message: 'End time must be after start time' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Validate attendees
  if (!Array.isArray(attendeeUserIds)) {
    return new Response(JSON.stringify({ message: 'attendeeUserIds must be an array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  if (attendeeUserIds.length > 50) {
    return new Response(JSON.stringify({ message: 'Maximum 50 attendees allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Verify all attendees are real users connected to the creator
  const users = (await readJSON('users/users.json')) || []
  const usersById = new Map<string, User>(users.map((u: any) => [u.id, u]))
  const connectionSummary = await getConnectionSummary(userId)
  const connectedSet = new Set(connectionSummary.connectedUserIds)

  for (const attendeeId of attendeeUserIds) {
    if (attendeeId === userId) continue // creator is always allowed
    if (!usersById.has(attendeeId)) {
      return new Response(JSON.stringify({ message: `User ${attendeeId} not found` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (!connectedSet.has(attendeeId)) {
      const attendeeUser = usersById.get(attendeeId)
      return new Response(JSON.stringify({ message: `You must be connected with ${attendeeUser?.username || attendeeId} to invite them` }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Create the app-native event
  const event = await createEvent(userId, {
    title: title.trim(),
    description: description?.trim() || undefined,
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    attendeeUserIds
  })

  // If creator has Google Calendar connected, sync to Google Calendar
  const creator = usersById.get(userId) as User | undefined
  let googleEventLink: string | undefined

  if (creator?.googleCalendarConnected && creator.googleAccessToken) {
    try {
      // Gather attendee emails (only for users who have emails on file)
      const attendeeEmails = attendeeUserIds
        .map((id) => usersById.get(id)?.email)
        .filter((email): email is string => !!email)

      const googleResult = await createGoogleCalendarEvent(creator, {
        title: title.trim(),
        description: description?.trim() || undefined,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        attendeeEmails
      })

      await updateEventGoogleSync(event.id, googleResult.googleEventId, googleResult.googleEventLink)
      googleEventLink = googleResult.googleEventLink
    } catch (err: any) {
      // Google sync failure should not fail the entire event creation
      console.error('Google Calendar sync failed:', err.message)
    }
  }

  // Enrich response
  const enrichedEvent = {
    ...event,
    ...(googleEventLink ? { googleEventLink } : {}),
    attendees: event.attendeeUserIds.map((id) => {
      const u = usersById.get(id)
      return { id, username: u?.username || 'Unknown user' }
    }),
    creatorUsername: usersById.get(event.creatorId)?.username || 'Unknown user'
  }

  return new Response(JSON.stringify({ event: enrichedEvent }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  })
}
