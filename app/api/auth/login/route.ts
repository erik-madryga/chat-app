import { readJSON } from '../../../../lib/blobClient'
import bcrypt from 'bcryptjs'
import { createSessionCookie, signToken } from '../../../../lib/auth'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const limit = rateLimit(`login:${ip}`, 10, 60 * 1000)
  if (limit.limited) {
    return new Response(JSON.stringify({ message: 'Too many attempts. Please try again soon.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) }
    })
  }

  const body = await req.json()
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '')
  if (!username || !password) return new Response(JSON.stringify({ message: 'Missing' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (username.length > 64 || password.length > 256) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase())
  if (!user?.passwordHash) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const ok = bcrypt.compareSync(password, user.passwordHash)
  if (!ok) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const token = signToken({ userId: user.id })
  const cookie = createSessionCookie(token)
  return new Response(JSON.stringify({ user: { id: user.id, username: user.username } }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
