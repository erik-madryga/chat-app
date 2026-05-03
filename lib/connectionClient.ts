import { readJSON, writeJSON } from './blobClient'
import { v4 as uuidv4 } from 'uuid'

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'declined'

export type ConnectionRequest = {
  id: string
  fromUserId: string
  toUserId: string
  status: ConnectionRequestStatus
  createdAt: string
  updatedAt: string
}

const CONNECTION_REQUESTS_KEY = 'connections/requests.json'

export async function listConnectionRequests() {
  return ((await readJSON(CONNECTION_REQUESTS_KEY)) || []) as ConnectionRequest[]
}

async function saveConnectionRequests(requests: ConnectionRequest[]) {
  await writeJSON(CONNECTION_REQUESTS_KEY, requests)
}

export async function getConnectionSummary(userId: string) {
  const requests = await listConnectionRequests()
  const connectedUserIds = new Set<string>()

  const acceptedRequests = requests.filter((request) =>
    request.status === 'accepted' &&
    (request.fromUserId === userId || request.toUserId === userId)
  )
  for (const request of acceptedRequests) {
    connectedUserIds.add(request.fromUserId === userId ? request.toUserId : request.fromUserId)
  }

  const pendingRequests = requests.filter((request) => request.status === 'pending')
  const incomingRequests = pendingRequests.filter((request) =>
    request.toUserId === userId &&
    !connectedUserIds.has(request.fromUserId)
  )
  const outgoingRequests = pendingRequests.filter((request) =>
    request.fromUserId === userId &&
    !connectedUserIds.has(request.toUserId)
  )

  return { connectedUserIds: Array.from(connectedUserIds), incomingRequests, outgoingRequests }
}

export async function getConnectionStatus(userId: string, otherUserId: string) {
  const requests = await listConnectionRequests()
  const relatedRequests = requests.filter((item) =>
    (item.fromUserId === userId && item.toUserId === otherUserId) ||
    (item.fromUserId === otherUserId && item.toUserId === userId)
  )
  const request = relatedRequests.find((item) => item.status === 'accepted') ||
    relatedRequests.find((item) => item.status === 'pending')

  if (!request) return 'none'
  if (request.status === 'accepted') return 'connected'
  if (request.status !== 'pending') return 'none'
  return request.fromUserId === userId ? 'outgoing' : 'incoming'
}

export async function createConnectionRequest(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) throw new Error('Cannot connect to yourself')

  const requests = await listConnectionRequests()
  const existingIndex = requests.findIndex((request) =>
    (request.fromUserId === fromUserId && request.toUserId === toUserId) ||
    (request.fromUserId === toUserId && request.toUserId === fromUserId)
  )
  const existing = existingIndex >= 0 ? requests[existingIndex] : null

  if (existing?.status === 'accepted') return existing
  if (existing?.status === 'pending') return existing

  if (existing) {
    requests[existingIndex] = {
      ...existing,
      fromUserId,
      toUserId,
      status: 'pending',
      updatedAt: new Date().toISOString()
    }
    await saveConnectionRequests(requests)
    return requests[existingIndex]
  }

  const now = new Date().toISOString()
  const request: ConnectionRequest = {
    id: uuidv4(),
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }

  requests.push(request)
  await saveConnectionRequests(requests)
  return request
}

export async function respondToConnectionRequest(userId: string, requestId: string, action: 'accept' | 'decline') {
  const requests = await listConnectionRequests()
  const requestIndex = requests.findIndex((request) => request.id === requestId)
  if (requestIndex === -1) throw new Error('Request not found')

  const request = requests[requestIndex]
  if (request.toUserId !== userId) throw new Error('Forbidden')
  if (request.status !== 'pending') return request

  const now = new Date().toISOString()
  for (let index = 0; index < requests.length; index += 1) {
    const item = requests[index]
    const isSamePair =
      (item.fromUserId === request.fromUserId && item.toUserId === request.toUserId) ||
      (item.fromUserId === request.toUserId && item.toUserId === request.fromUserId)

    if (isSamePair && item.status === 'pending') {
      requests[index] = {
        ...item,
        status: action === 'accept' ? 'accepted' : 'declined',
        updatedAt: now
      }
    }
  }

  await saveConnectionRequests(requests)
  return requests.find((item) => item.id === requestId) || requests[requestIndex]
}

export async function cancelConnectionRequest(userId: string, requestId: string) {
  const requests = await listConnectionRequests()
  const requestIndex = requests.findIndex((request) => request.id === requestId)
  if (requestIndex === -1) throw new Error('Request not found')

  const request = requests[requestIndex]
  if (request.fromUserId !== userId) throw new Error('Forbidden')
  if (request.status !== 'pending') return request

  const now = new Date().toISOString()
  for (let index = 0; index < requests.length; index += 1) {
    const item = requests[index]
    const isSamePair =
      (item.fromUserId === request.fromUserId && item.toUserId === request.toUserId) ||
      (item.fromUserId === request.toUserId && item.toUserId === request.fromUserId)

    if (isSamePair && item.status === 'pending') {
      requests[index] = {
        ...item,
        status: 'declined',
        updatedAt: now
      }
    }
  }

  await saveConnectionRequests(requests)
  return requests.find((item) => item.id === requestId) || requests[requestIndex]
}
