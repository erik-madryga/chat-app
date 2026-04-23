import { readJSON } from '../../../../lib/blobClient'
import { verifyToken } from '../../../../lib/auth'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return new Response(JSON.stringify({ user: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const payload: any = verifyToken(token)
  if (!payload || !payload.userId) return new Response(JSON.stringify({ user: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const user = users.find((u: any) => u.id === payload.userId)
  if (!user) return new Response(JSON.stringify({ user: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const safeUser = { id: user.id, username: user.username }
  return new Response(JSON.stringify({ user: safeUser }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
