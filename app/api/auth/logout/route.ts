import { clearSessionCookie } from '../../../../lib/auth'

export async function POST() {
  const cookie = clearSessionCookie()
  return new Response(JSON.stringify({ message: 'Signed out' }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
