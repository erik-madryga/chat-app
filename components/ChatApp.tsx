'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useMessages from '../hooks/useMessages'

type SessionSummary = { sessionId: string; participantIds: string[]; lastMessagePreview?: string; updatedAt?: string; messageCount?: number }
type ConnectionRequest = { id: string; fromUser?: any; toUser?: any }

export default function ChatApp() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [newUser, setNewUser] = useState('')
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRequest[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [connectingUserIds, setConnectingUserIds] = useState<string[]>([])
  const [respondingRequestIds, setRespondingRequestIds] = useState<string[]>([])
  const [cancelingRequestIds, setCancelingRequestIds] = useState<string[]>([])

  const { messages, sendMessage } = useMessages(activeSessionId, user?.id)

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!meRes.ok) return router.push('/sign-in')
        const meData = await meRes.json()
        setUser(meData.user)
        await loadSessions()
        await loadConnections()
      } catch (err) {
        router.push('/sign-in')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  async function loadSessions() {
    const res = await fetch('/api/chats', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setSessions(data.sessions || [])
    if ((data.sessions || []).length > 0 && !activeSessionId) setActiveSessionId(data.sessions[0].sessionId)
  }

  async function loadConnections() {
    const res = await fetch('/api/connections', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    setAllUsers(data.connectedUsers || [])
    setIncomingRequests(data.incomingRequests || [])
    setOutgoingRequests(data.outgoingRequests || [])
  }

  async function handleCreateSession() {
    if (!newUser.trim()) return
    const res = await fetch('/api/chats', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantUsernames: [newUser.trim()] }) })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return alert(data?.message || 'Could not create chat')
    }
    const data = await res.json()
    await loadSessions()
    setNewUser('')
    if (data.session?.id) setActiveSessionId(data.session.id)
  }

  async function handleSend() {
    if (!activeSessionId) return
    if (!input.trim()) return
    const messageContent = input
    setInput('')
    try {
      await sendMessage(messageContent)
      await loadSessions()
    } catch (e) {
      setInput(messageContent)
      alert('Send failed')
    }
  }

  async function handleSearchUsers() {
    if (userSearch.trim().length < 2) {
      setUserSearchResults([])
      return
    }

    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/connections/search?q=${encodeURIComponent(userSearch.trim())}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setUserSearchResults(data.users || [])
    } finally {
      setSearchingUsers(false)
    }
  }

  async function handleSendConnectionRequest(toUserId: string) {
    setConnectingUserIds((ids) => [...ids, toUserId])
    setUserSearchResults((results) => results.map((result) =>
      result.id === toUserId ? { ...result, connectionStatus: 'outgoing' } : result
    ))

    try {
      const res = await fetch('/api/connections/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setUserSearchResults((results) => results.map((result) =>
          result.id === toUserId ? { ...result, connectionStatus: 'none' } : result
        ))
        return alert(data?.message || 'Could not send connection request')
      }

      await loadConnections()
    } finally {
      setConnectingUserIds((ids) => ids.filter((id) => id !== toUserId))
    }
  }

  async function handleRespondToConnectionRequest(requestId: string, action: 'accept' | 'decline') {
    const request = incomingRequests.find((item) => item.id === requestId)
    const previousIncomingRequests = incomingRequests
    const previousUsers = allUsers

    setRespondingRequestIds((ids) => [...ids, requestId])
    setIncomingRequests((requests) => requests.filter((item) => item.id !== requestId))

    if (action === 'accept' && request?.fromUser) {
      setAllUsers((users) => {
        if (users.some((item) => item.id === request.fromUser.id)) return users
        return [...users, request.fromUser].sort((a, b) => a.username.localeCompare(b.username))
      })
      setUserSearchResults((results) => results.map((result) =>
        result.id === request.fromUser.id ? { ...result, connectionStatus: 'connected' } : result
      ))
    }

    try {
      const res = await fetch('/api/connections/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setIncomingRequests(previousIncomingRequests)
        setAllUsers(previousUsers)
        return alert(data?.message || 'Could not update connection request')
      }

      await loadConnections()
      await loadSessions()
    } finally {
      setRespondingRequestIds((ids) => ids.filter((id) => id !== requestId))
    }
  }

  async function handleCancelConnectionRequest(requestId: string) {
    const request = outgoingRequests.find((item) => item.id === requestId)
    const previousOutgoingRequests = outgoingRequests
    const previousSearchResults = userSearchResults

    setCancelingRequestIds((ids) => [...ids, requestId])
    setOutgoingRequests((requests) => requests.filter((item) =>
      item.id !== requestId && item.toUser?.id !== request?.toUser?.id
    ))

    if (request?.toUser) {
      setUserSearchResults((results) => results.map((result) =>
        result.id === request.toUser.id ? { ...result, connectionStatus: 'none' } : result
      ))
    }

    try {
      const res = await fetch('/api/connections/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'cancel' })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setOutgoingRequests(previousOutgoingRequests)
        setUserSearchResults(previousSearchResults)
        return alert(data?.message || 'Could not cancel connection request')
      }

      await loadConnections()
    } finally {
      setCancelingRequestIds((ids) => ids.filter((id) => id !== requestId))
    }
  }

  if (loading) return <div>Loading...</div>
  if (!user) return null

  const availableUsers = allUsers.filter(u => user && u.id !== user.id)
  const usersById = new Map(allUsers.map(u => [u.id, u]))
  const getSessionName = (session: SessionSummary) => {
    const otherParticipantIds = session.participantIds.filter((id) => id !== user.id)
    if (otherParticipantIds.length === 0) return user?.username || 'You'

    return otherParticipantIds
      .map((id) => usersById.get(id)?.username || 'Unknown user')
      .join(', ')
  }
  const activeChatsByName = sessions.reduce((chats, session) => {
    const name = getSessionName(session)
    const existing = chats.get(name)
    const existingUpdatedAt = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0
    const sessionUpdatedAt = session.updatedAt ? new Date(session.updatedAt).getTime() : 0

    if (!existing || sessionUpdatedAt >= existingUpdatedAt) {
      chats.set(name, session)
    }

    return chats
  }, new Map<string, SessionSummary>())
  const activeChats = Array.from(activeChatsByName.entries())
    .map(([name, session]) => ({ name, session }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex gap-4">
      <aside className="w-80 space-y-4">
        <div className="bg-white rounded shadow p-3">
          <div className="mb-3">
            <div>
              <div className="text-sm text-gray-500">Signed in as</div>
              <div className="font-medium">{user?.username}</div>
            </div>
          </div>
          <div>
            <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Start chat: username" className="w-full p-2 border rounded" />
            <button onClick={handleCreateSession} className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded">Start</button>
          </div>
        </div>

        {incomingRequests.length > 0 && (
          <div className="bg-white rounded shadow p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">Connection requests</div>
            <div className="space-y-2">
              {incomingRequests.map((request) => (
                <div key={request.id} className="p-2 rounded bg-gray-50">
                  <div className="text-sm font-medium">{request.fromUser?.username}</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleRespondToConnectionRequest(request.id, 'accept')} disabled={respondingRequestIds.includes(request.id)} className="px-2 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-60">
                      {respondingRequestIds.includes(request.id) ? 'Accepting...' : 'Accept'}
                    </button>
                    <button onClick={() => handleRespondToConnectionRequest(request.id, 'decline')} disabled={respondingRequestIds.includes(request.id)} className="px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-60">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded shadow p-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">Active chats</div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {activeChats.length === 0 && <div className="text-sm text-gray-500">No active chats yet</div>}
            {activeChats.map(({ name, session }) => (
              <button key={name} onClick={() => setActiveSessionId(session.sessionId)} className={`w-full text-left p-2 rounded ${session.sessionId === activeSessionId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-gray-500 truncate">{session.lastMessagePreview || 'No messages yet'}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded shadow p-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">Users</div>
          <div className="space-y-1 max-h-72 overflow-auto">
            {availableUsers.map(u => (
              <button
                key={u.id}
                className="w-full text-left px-2 py-1 rounded hover:bg-gray-50"
                onClick={() => { setNewUser(u.username) }}
              >
                {u.username}
              </button>
            ))}
            {availableUsers.length === 0 && <div className="text-sm text-gray-500">No other users found</div>}
          </div>
        </div>

        {outgoingRequests.length > 0 && (
          <div className="bg-white rounded shadow p-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">Sent requests</div>
            <div className="space-y-2">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{request.toUser?.username}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <button onClick={() => handleCancelConnectionRequest(request.id)} disabled={cancelingRequestIds.includes(request.id)} className="px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-60">
                    {cancelingRequestIds.includes(request.id) ? 'Canceling...' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded shadow p-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">Find users</div>
          <div className="flex gap-2">
            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchUsers() }} placeholder="Search username" className="min-w-0 flex-1 p-2 border rounded" />
            <button onClick={handleSearchUsers} className="px-3 py-2 bg-blue-600 text-white rounded">{searchingUsers ? '...' : 'Search'}</button>
          </div>
          <div className="mt-3 space-y-2 max-h-56 overflow-auto">
            {userSearchResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-50">
                <div className="min-w-0 text-sm font-medium truncate">{result.username}</div>
                {result.connectionStatus === 'none' && (
                  <button onClick={() => handleSendConnectionRequest(result.id)} disabled={connectingUserIds.includes(result.id)} className="px-2 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-60">
                    {connectingUserIds.includes(result.id) ? 'Sending...' : 'Connect'}
                  </button>
                )}
                {result.connectionStatus === 'outgoing' && (() => {
                  const request = outgoingRequests.find((item) => item.toUser?.id === result.id)
                  if (!request) return <div className="text-xs text-gray-500">{connectingUserIds.includes(result.id) ? 'Sending...' : 'Pending'}</div>
                  return (
                    <button onClick={() => handleCancelConnectionRequest(request.id)} disabled={cancelingRequestIds.includes(request.id)} className="px-2 py-1 text-sm text-gray-600 rounded hover:bg-gray-100 disabled:opacity-60">
                      {cancelingRequestIds.includes(request.id) ? 'Canceling...' : 'Cancel'}
                    </button>
                  )
                })()}
                {result.connectionStatus === 'incoming' && <div className="text-xs text-gray-500">Requested you</div>}
                {result.connectionStatus === 'connected' && <div className="text-xs text-gray-500">Connected</div>}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 bg-white rounded shadow p-4 flex flex-col">
        <div className="flex-1 overflow-auto space-y-3 p-2">
          {(!messages || messages.length === 0) && <div className="text-sm text-gray-500">No messages yet</div>}
          {messages.map((m: any) => (
            <div key={m.id} className={`p-2 rounded ${m.senderId === user?.id ? 'bg-blue-50 self-end' : 'bg-gray-100 self-start'}`}>
              <div className="text-sm">{m.content}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(m.timestamp).toLocaleString()}
                {m.senderId === user?.id && m.deliveryStatus && ` · ${m.deliveryStatus === 'failed' ? 'Failed' : m.deliveryStatus === 'sent' ? 'Sent' : 'Delivered'}`}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }} placeholder="Message..." className="flex-1 p-2 border rounded" />
            <button onClick={handleSend} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
          </div>
        </div>
      </section>
    </div>
  )
}
