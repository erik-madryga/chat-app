'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useMessages from '../hooks/useMessages'

type SessionSummary = { sessionId: string; participantIds: string[]; lastMessagePreview?: string; updatedAt?: string; messageCount?: number }

export default function ChatApp() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [newUser, setNewUser] = useState('')
  const [loading, setLoading] = useState(true)

  const { messages, sendMessage } = useMessages(activeSessionId)

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!meRes.ok) return router.push('/sign-in')
        const meData = await meRes.json()
        setUser(meData.user)
        await loadSessions()
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

  async function handleCreateSession() {
    if (!newUser.trim()) return
    const res = await fetch('/api/chats', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantUsernames: [newUser.trim()] }) })
    if (!res.ok) return alert('Could not create chat')
    const data = await res.json()
    await loadSessions()
    setNewUser('')
    if (data.session?.id) setActiveSessionId(data.session.id)
  }

  async function handleSend() {
    if (!activeSessionId) return
    if (!input.trim()) return
    try {
      await sendMessage(input)
      setInput('')
      await loadSessions()
    } catch (e) {
      alert('Send failed')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="flex gap-4">
      <aside className="w-80 bg-white rounded shadow p-3">
        <div className="mb-3">
          <div className="text-sm text-gray-500">Signed in as</div>
          <div className="font-medium">{user?.username}</div>
        </div>
        <div className="mb-3">
          <input value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="Start chat: username" className="w-full p-2 border rounded" />
          <button onClick={handleCreateSession} className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded">Start</button>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <button key={s.sessionId} onClick={() => setActiveSessionId(s.sessionId)} className={`w-full text-left p-2 rounded ${s.sessionId === activeSessionId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
              <div className="text-sm font-medium">{s.participantIds.filter((id) => id !== user.id).join(', ') || 'You'}</div>
              <div className="text-xs text-gray-500 truncate">{s.lastMessagePreview || 'No messages yet'}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 bg-white rounded shadow p-4 flex flex-col">
        <div className="flex-1 overflow-auto space-y-3 p-2">
          {(!messages || messages.length === 0) && <div className="text-sm text-gray-500">No messages yet</div>}
          {messages.map((m: any) => (
            <div key={m.id} className={`p-2 rounded ${m.senderId === user.id ? 'bg-blue-50 self-end' : 'bg-gray-100 self-start'}`}>
              <div className="text-sm">{m.content}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(m.timestamp).toLocaleString()}</div>
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
