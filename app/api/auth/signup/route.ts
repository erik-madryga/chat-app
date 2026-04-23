import { readJSON, writeJSON } from '../../../../lib/blobClient'
import bcrypt from 'bcryptjs'
import { signToken } from '../../../../lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password } = body
  if (!username || !password) return new Response(JSON.stringify({ message: 'Missing credentials' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const exists = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase())
  if (exists) return new Response(JSON.stringify({ message: 'User already exists' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  const hashed = bcrypt.hashSync(password, 10)
  const id = uuidv4()
  const user = { id, username, passwordHash: hashed, createdAt: new Date().toISOString() }
  users.push(user)
  await writeJSON('users/users.json', users)

  const token = signToken({ userId: id })
  const cookie = `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
  return new Response(JSON.stringify({ user: { id, username } }), { status: 201, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
