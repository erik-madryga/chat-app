import { getUserIdFromRequest } from '../../../../lib/auth'
import { cancelConnectionRequest, createConnectionRequest, respondToConnectionRequest } from '../../../../lib/connectionClient'
import { readJSON } from '../../../../lib/blobClient'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const toUserId = typeof body?.toUserId === 'string' ? body.toUserId : ''
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
  const userId = getUserIdFromRequest(req)
  if (!userId) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json()
  const requestId = typeof body?.requestId === 'string' ? body.requestId : ''
  const action = typeof body?.action === 'string' ? body.action : ''
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
