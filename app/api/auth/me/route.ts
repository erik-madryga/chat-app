import { readJSON } from '../../../../lib/blobClient'
import { getUserIdFromRequest } from '../../../../lib/auth'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ user: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const users = (await readJSON('users/users.json')) || []
  const user = users.find((u: any) => u.id === userId)
  if (!user) return new Response(JSON.stringify({ user: null }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const safeUser = { id: user.id, username: user.username }
  return new Response(JSON.stringify({ user: safeUser }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
