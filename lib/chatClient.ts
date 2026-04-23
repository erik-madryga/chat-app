import { readJSON, writeJSON } from './blobClient'
import { v4 as uuidv4 } from 'uuid'

export type ChatSession = {
  id: string
  participantIds: string[]
  createdAt: string
  updatedAt: string
  isGroup: boolean
  groupName?: string
  lastMessagePreview?: string | null
  messageCount: number
}

export type Message = {
  id: string
  sessionId: string
  senderId: string
  content: string
  timestamp: string
}

const SESSIONS_DIR = 'chats/sessions'
const MESSAGES_DIR = 'chats/messages'
const USER_STATE_DIR = 'chats/user-state'

export async function createSession(participantIds: string[], groupName?: string) {
  const id = uuidv4()
  const now = new Date().toISOString()
  const session: ChatSession = {
    id,
    participantIds,
    createdAt: now,
    updatedAt: now,
    isGroup: participantIds.length > 2,
    groupName: groupName || undefined,
    lastMessagePreview: null,
    messageCount: 0
  }
  await writeJSON(`${SESSIONS_DIR}/${id}.json`, session)

  // update per-user indexes
  for (const pid of participantIds) {
    const key = `${USER_STATE_DIR}/${pid}.json`
    const state = (await readJSON(key)) || { userId: pid, sessions: [] }
    // remove existing entry for this session if present
    state.sessions = state.sessions.filter((s: any) => s.sessionId !== id)
    state.sessions.unshift({ sessionId: id, participantIds, lastMessagePreview: null, messageCount: 0, updatedAt: now })
    await writeJSON(key, state)
  }

  return session
}

export async function listSessionsForUser(userId: string) {
  const key = `${USER_STATE_DIR}/${userId}.json`
  const state = (await readJSON(key)) || { userId, sessions: [] }
  return state.sessions
}

export async function getSession(sessionId: string) {
  return (await readJSON(`${SESSIONS_DIR}/${sessionId}.json`)) || null
}

export async function postMessage(sessionId: string, senderId: string, content: string) {
  content = String(content || '')
  if (!content.trim()) throw new Error('Empty message')
  const messagesKey = `${MESSAGES_DIR}/${sessionId}.json`
  const messages = (await readJSON(messagesKey)) || []
  const message: Message = { id: uuidv4(), sessionId, senderId, content, timestamp: new Date().toISOString() }
  messages.push(message)
  await writeJSON(messagesKey, messages)

  // update session metadata
  const sessionKey = `${SESSIONS_DIR}/${sessionId}.json`
  const session: any = (await readJSON(sessionKey)) || null
  if (session) {
    session.lastMessagePreview = content.slice(0, 200)
    session.updatedAt = message.timestamp
    session.messageCount = (session.messageCount || 0) + 1
    await writeJSON(sessionKey, session)

    // update user-state for participants
    for (const pid of session.participantIds) {
      const key = `${USER_STATE_DIR}/${pid}.json`
      const state = (await readJSON(key)) || { userId: pid, sessions: [] }
      const idx = state.sessions.findIndex((s: any) => s.sessionId === sessionId)
      if (idx >= 0) {
        state.sessions[idx].lastMessagePreview = session.lastMessagePreview
        state.sessions[idx].updatedAt = session.updatedAt
        state.sessions[idx].messageCount = session.messageCount
        // move to top
        const [item] = state.sessions.splice(idx, 1)
        state.sessions.unshift(item)
      } else {
        state.sessions.unshift({ sessionId, participantIds: session.participantIds, lastMessagePreview: session.lastMessagePreview, updatedAt: session.updatedAt, messageCount: session.messageCount })
      }
      await writeJSON(key, state)
    }
  }

  return message
}

export async function getMessages(sessionId: string, limit = 50, before?: string) {
  const messages = (await readJSON(`${MESSAGES_DIR}/${sessionId}.json`)) || []
  messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (before) {
    const idx = messages.findIndex((m: any) => m.timestamp >= before)
    const filtered = idx === -1 ? messages : messages.slice(0, idx)
    return filtered.slice(-limit)
  } else {
    return messages.slice(-limit)
  }
}

export default {
  createSession,
  listSessionsForUser,
  getSession,
  postMessage,
  getMessages
}
