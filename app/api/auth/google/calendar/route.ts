import { randomBytes } from 'crypto'
import { getUserIdFromRequest } from '../../../../../lib/auth'

function createCalendarStateCookie(state: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `oauth_calendar_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`
}

export async function GET(req: Request) {
  // Require the user to already be authenticated
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return new Response(JSON.stringify({ message: 'GOOGLE_CLIENT_ID is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const origin = new URL(req.url).origin
  const state = randomBytes(32).toString('hex')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/calendar/callback`,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
    state,
    access_type: 'offline',
    prompt: 'consent'
  })

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      'Set-Cookie': createCalendarStateCookie(state)
    }
  })
}
