export async function POST() {
  const cookie = 'token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  return new Response(JSON.stringify({ message: 'Signed out' }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } })
}
