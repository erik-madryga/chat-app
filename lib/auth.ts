import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret'

export function signToken(payload: Record<string, any>, expiresIn = '7d') {
  // jsonwebtoken v9 types can be strict; cast to any to avoid overload mismatches
  return (jwt as any).sign(payload, SECRET, { expiresIn })
}

export function verifyToken(token: string) {
  try {
    return (jwt as any).verify(token, SECRET)
  } catch (err) {
    return null
  }
}
