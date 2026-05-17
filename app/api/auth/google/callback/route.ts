import { v4 as uuidv4 } from 'uuid'
import { createSessionCookie, signToken } from '../../../../../lib/auth'
import { readJSON, writeJSON } from '../../../../../lib/blobClient'

type GoogleUserInfo = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  given_name?: string
}

function getCookie(req: Request, name: string) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

function clearOAuthStateCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 24)
}

function buildUniqueUsername(users: any[], profile: GoogleUserInfo) {
  const emailName = profile.email?.split('@')[0] || ''
  const base = normalizeUsername(profile.given_name || emailName || profile.name || 'google-user') || 'google-user'
  let candidate = base
  let suffix = 1
  const existing = new Set(users.map((user: any) => String(user.username || '').toLowerCase()))

  while (existing.has(candidate.toLowerCase())) {
    suffix += 1
    candidate = `${base.slice(0, 24)}-${suffix}`
  }

  return candidate
}

async function exchangeCodeForAccessToken(code: string, redirectUri: string) {
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

  if (!response.ok) throw new Error('Could not verify Google sign-in')
  const data = await response.json()
  if (!data.access_token) throw new Error('Google did not return an access token')
  return String(data.access_token)
}

async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) throw new Error('Could not load Google profile')
  return (await response.json()) as GoogleUserInfo
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const storedState = getCookie(req, 'oauth_state')

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(JSON.stringify({ message: 'Invalid Google sign-in state' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearOAuthStateCookie() }
    })
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`
    const accessToken = await exchangeCodeForAccessToken(code, redirectUri)
    const profile = await getGoogleUserInfo(accessToken)

    if (!profile.sub || !profile.email || profile.email_verified === false) {
      return new Response(JSON.stringify({ message: 'Google account email must be verified' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearOAuthStateCookie() }
      })
    }

    const users = (await readJSON('users/users.json')) || []
    let user = users.find((item: any) => item.googleId === profile.sub)

    if (!user) {
      const emailMatch = users.find((item: any) => String(item.email || '').toLowerCase() === profile.email?.toLowerCase())
      if (emailMatch && !emailMatch.googleId) {
        user = { ...emailMatch, googleId: profile.sub, email: profile.email, authProvider: emailMatch.passwordHash ? 'password_google' : 'google' }
        const index = users.findIndex((item: any) => item.id === emailMatch.id)
        users[index] = user
      } else if (emailMatch) {
        user = emailMatch
      } else {
        user = {
          id: uuidv4(),
          username: buildUniqueUsername(users, profile),
          email: profile.email,
          googleId: profile.sub,
          authProvider: 'google',
          createdAt: new Date().toISOString()
        }
        users.push(user)
      }

      await writeJSON('users/users.json', users)
    }

    const token = signToken({ userId: user.id })
    const headers = new Headers({ Location: '/chats' })
    headers.append('Set-Cookie', clearOAuthStateCookie())
    headers.append('Set-Cookie', createSessionCookie(token))
    return new Response(null, { status: 302, headers })
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || 'Google sign-in failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearOAuthStateCookie() }
    })
  }
}
