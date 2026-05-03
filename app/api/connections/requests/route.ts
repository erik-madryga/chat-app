import { verifyToken } from '../../../../lib/auth'
import { cancelConnectionRequest, createConnectionRequest, respondToConnectionRequest } from '../../../../lib/connectionClient'
import { readJSON } from '../../../../lib/blobClient'

function getUserId(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(^|;\s*)token=([^;]+)/)
  const token = match ? match[2] : null
  if (!token) return null
  const payload: any = verifyToken(token)
  return payload?.userId || null
}

export async function POST(req: Request) {
  const userId = getUserId(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const toUserId = body?.toUserId
  if (!toUserId) return new Response(JSON.stringify({ message: 'Missing user' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  try {
    const users = (await readJSON('users/users.json')) || []
    if (!users.some((user: any) => user.id === toUserId)) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const request = await createConnectionRequest(userId, toUserId)
    return new Response(JSON.stringify({ request }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || 'Could not send request' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
}

export async function PATCH(req: Request) {
  const userId = getUserId(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const requestId = body?.requestId
  const action = body?.action
  if (!requestId || !['accept', 'decline', 'cancel'].includes(action)) return new Response(JSON.stringify({ message: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  try {
    const request = action === 'cancel'
      ? await cancelConnectionRequest(userId, requestId)
      : await respondToConnectionRequest(userId, requestId, action)
    return new Response(JSON.stringify({ request }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    const status = err.message === 'Forbidden' ? 403 : 404
    return new Response(JSON.stringify({ message: err.message || 'Could not update request' }), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
