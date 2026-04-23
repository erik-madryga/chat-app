'use client'

import { useEffect, useRef, useState } from 'react'

type Message = { id: string; sessionId: string; senderId: string; content: string; timestamp: string }

export default function useMessages(sessionId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }
    let mounted = true

    ;(async () => {
      try {
        const res = await fetch(`/api/chats/${sessionId}/messages?limit=200`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (mounted) setMessages(data.messages || [])
      } catch (err) {
        // ignore
      }
    })()

    const es = new EventSource(`/api/chats/${sessionId}/stream`)
    const onMsg = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        setMessages((prev) => [...prev, payload])
      } catch (err) {
        // ignore
      }
    }
    es.addEventListener('message', onMsg)
    es.addEventListener('error', () => {
      // keep simple; browser will try to reconnect
    })
    esRef.current = es

    return () => {
      mounted = false
      try { es.removeEventListener('message', onMsg); es.close() } catch (e) {}
      esRef.current = null
    }
  }, [sessionId])

  async function sendMessage(content: string) {
    if (!sessionId) throw new Error('No session')
    const res = await fetch(`/api/chats/${sessionId}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
    if (!res.ok) throw new Error('send failed')
    const data = await res.json()
    setMessages((prev) => [...prev, data.message])
    return data.message
  }

  return { messages, sendMessage }
}
