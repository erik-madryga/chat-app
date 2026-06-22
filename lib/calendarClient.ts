import { readJSON, writeJSON } from './blobClient'
import { v4 as uuidv4 } from 'uuid'

export type CalendarEvent = {
  id: string
  creatorId: string
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  attendeeUserIds: string[]
  googleEventId?: string
  googleEventLink?: string
  createdAt: string
  updatedAt: string
}

const EVENTS_KEY = 'calendar/events.json'

async function loadEvents(): Promise<CalendarEvent[]> {
  return ((await readJSON(EVENTS_KEY)) || []) as CalendarEvent[]
}

async function saveEvents(events: CalendarEvent[]) {
  await writeJSON(EVENTS_KEY, events)
}

export async function createEvent(
  creatorId: string,
  details: {
    title: string
    description?: string
    startDateTime: string
    endDateTime: string
    attendeeUserIds: string[]
  }
): Promise<CalendarEvent> {
  const now = new Date().toISOString()

  // Ensure creator is in attendees
  const attendeeUserIds = details.attendeeUserIds.includes(creatorId)
    ? details.attendeeUserIds
    : [creatorId, ...details.attendeeUserIds]

  const event: CalendarEvent = {
    id: uuidv4(),
    creatorId,
    title: details.title,
    description: details.description || undefined,
    startDateTime: details.startDateTime,
    endDateTime: details.endDateTime,
    attendeeUserIds,
    createdAt: now,
    updatedAt: now
  }

  const events = await loadEvents()
  events.push(event)
  await saveEvents(events)

  return event
}

export async function listEventsForUser(userId: string): Promise<CalendarEvent[]> {
  const events = await loadEvents()
  const userEvents = events.filter((event) => event.attendeeUserIds.includes(userId))

  // Sort by start time ascending (upcoming first)
  userEvents.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())

  return userEvents
}

export async function getEvent(eventId: string): Promise<CalendarEvent | null> {
  const events = await loadEvents()
  return events.find((event) => event.id === eventId) || null
}

export async function updateEventGoogleSync(
  eventId: string,
  googleEventId: string,
  googleEventLink: string
): Promise<CalendarEvent | null> {
  const events = await loadEvents()
  const index = events.findIndex((event) => event.id === eventId)
  if (index === -1) return null

  events[index] = {
    ...events[index],
    googleEventId,
    googleEventLink,
    updatedAt: new Date().toISOString()
  }

  await saveEvents(events)
  return events[index]
}
