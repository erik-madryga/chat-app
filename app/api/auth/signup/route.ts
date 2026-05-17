import { readJSON, writeJSON } from '../../../../lib/blobClient'
import bcrypt from 'bcryptjs'
import { createSessionCookie, signToken } from '../../../../lib/auth'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const limit = rateLimit(`signup:${ip}`, 5, 60 * 1000)
  if (limit.limited) {
    return new Response(JSON.stringify({ message: 'Too many attempts. Please try again soon.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter) }
    })
  }

  const body = await req.json()
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '')
  if (!username || !password) return new Response(JSON.stringify({ message: 'Missing credentials' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return new Response(JSON.stringify({ message: 'Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  if (password.length > 256) return new Response(JSON.stringify({ message: 'Password is too long' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const exists = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase())
  if (exists) return new Response(JSON.stringify({ message: 'User already exists' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const hashed = bcrypt.hashSync(password, 10)
  const id = uuidv4()
  const user = { id, username, passwordHash: hashed, createdAt: new Date().toISOString() }
  users.push(user)
  await writeJSON('users/users.json', users)

  const token = signToken({ userId: id })
  const cookie = createSessionCookie(token)
  return new Response(JSON.stringify({ user: { id, username } }), { status: 201, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
