import { readJSON } from '../../../../lib/blobClient'
import bcrypt from 'bcryptjs'
import { signToken } from '../../../../lib/auth'

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password } = body
  if (!username || !password) return new Response(JSON.stringify({ message: 'Missing' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const ok = bcrypt.compareSync(password, user.passwordHash)
  if (!ok) return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const token = signToken({ userId: user.id })
  const cookie = `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
  return new Response(JSON.stringify({ user: { id: user.id, username: user.username } }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
