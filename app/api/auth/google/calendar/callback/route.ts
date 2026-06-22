import { getUserIdFromRequest } from '../../../../../../lib/auth'
import { readJSON, writeJSON } from '../../../../../../lib/blobClient'

function getCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

function clearCalendarStateCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `oauth_calendar_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) throw new Error('Could not exchange code for calendar tokens')
  const data = await response.json()
  if (!data.access_token) throw new Error('Google did not return an access token')

  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = getCookie(req, 'oauth_calendar_state')

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(JSON.stringify({ message: 'Invalid calendar authorization state' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCalendarStateCookie() }
    })
  }

  // The user must already be signed in
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return new Response(JSON.stringify({ message: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCalendarStateCookie() }
    })
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/calendar/callback`
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code, redirectUri)

    // Update the user record with calendar tokens
    const users = (await readJSON('users/users.json')) || []
    const userIndex = users.findIndex((u: any) => u.id === userId)
    if (userIndex === -1) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCalendarStateCookie() }
      })
    }

    users[userIndex] = {
      ...users[userIndex],
      googleAccessToken: accessToken,
      ...(refreshToken ? { googleRefreshToken: refreshToken } : {}),
      googleCalendarConnected: true
    }

    await writeJSON('users/users.json', users)

    const headers = new Headers({ Location: '/chats' })
    headers.append('Set-Cookie', clearCalendarStateCookie())
    return new Response(null, { status: 302, headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || 'Calendar connection failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCalendarStateCookie() }
    })
  }
}
