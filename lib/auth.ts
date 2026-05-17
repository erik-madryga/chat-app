import jwt from 'jsonwebtoken'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
  return secret || 'dev-secret'
}

export function signToken(payload: Record<string, any>, expiresIn = '7d') {
  // jsonwebtoken v9 types can be strict; cast to any to avoid overload mismatches
  return (jwt as any).sign(payload, getSecret(), { expiresIn })
}

export function verifyToken(token: string) {
  try {
    return (jwt as any).verify(token, getSecret())
  } catch (err) {
    return null
  }
}

export function getTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  return match ? decodeURIComponent(match[2]) : null
}

export function getUserIdFromRequest(req: Request) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  const payload: any = verifyToken(token)
  return typeof payload?.userId === 'string' ? payload.userId : null
}

export function createSessionCookie(token: string, maxAge = COOKIE_MAX_AGE) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`
}
