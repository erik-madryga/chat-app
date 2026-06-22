import { readJSON, writeJSON } from './blobClient'
import type { User } from './types'

type GoogleCalendarEventInput = {
  title: string
  description?: string
  startDateTime: string
  endDateTime: string
  attendeeEmails: string[]
}

type GoogleCalendarEventResult = {
  googleEventId: string
  googleEventLink: string
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error_description || 'Failed to refresh Google access token')
  }

  const data = await response.json()
  if (!data.access_token) throw new Error('Google did not return a refreshed access token')

  return String(data.access_token)
}

async function updateUserAccessToken(userId: string, newAccessToken: string) {
  const users = (await readJSON('users/users.json')) || []
  const index = users.findIndex((u: any) => u.id === userId)
  if (index === -1) return

  users[index] = { ...users[index], googleAccessToken: newAccessToken }
  await writeJSON('users/users.json', users)
}

async function callGoogleCalendarAPI(
  accessToken: string,
  eventInput: GoogleCalendarEventInput
): Promise<GoogleCalendarEventResult> {
  const body = {
    summary: eventInput.title,
    description: eventInput.description || undefined,
    start: {
      dateTime: eventInput.startDateTime,
      timeZone: 'UTC'
    },
    end: {
      dateTime: eventInput.endDateTime,
      timeZone: 'UTC'
    },
    attendees: eventInput.attendeeEmails.map((email) => ({ email })),
    reminders: {
      useDefault: true
    }
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw Object.assign(
      new Error(errorData?.error?.message || 'Google Calendar API error'),
      { status: response.status }
    )
  }

  const data = await response.json()
  return {
    googleEventId: data.id,
    googleEventLink: data.htmlLink
  }
}

export async function createGoogleCalendarEvent(
  user: User,
  eventInput: GoogleCalendarEventInput
): Promise<GoogleCalendarEventResult> {
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('User has not connected Google Calendar')
  }

  try {
    return await callGoogleCalendarAPI(user.googleAccessToken, eventInput)
  } catch (err: any) {
    // If 401, try refreshing the token and retrying once
    if (err.status === 401) {
      const newAccessToken = await refreshGoogleAccessToken(user.googleRefreshToken)
      await updateUserAccessToken(user.id, newAccessToken)
      return await callGoogleCalendarAPI(newAccessToken, eventInput)
    }
    throw err
  }
}
