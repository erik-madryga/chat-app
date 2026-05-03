'use client'

import { useEffect, useRef, useState } from 'react'

type DeliveryStatus = 'sent' | 'delivered' | 'failed'
type Message = { id: string; sessionId: string; senderId: string; content: string; timestamp: string; deliveryStatus?: DeliveryStatus }

export default function useMessages(sessionId?: string | null, currentUserId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    setMessages([])

    if (!sessionId) {
      return
    }
    let mounted = true

    ;(async () => {
      try {
        const res = await fetch(`/api/chats/${sessionId}/messages?limit=200`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const sessionMessages = (data.messages || [])
          .filter((message: Message) => message.sessionId === sessionId)
          .map((message: Message) => ({ ...message, deliveryStatus: 'delivered' as DeliveryStatus }))
        if (mounted) {
          setMessages((prev) => {
            const pendingMessages = prev.filter((message) => message.id.startsWith('temp-') && message.sessionId === sessionId)
            return [...sessionMessages, ...pendingMessages]
          })
        }
      } catch (err) {
        // ignore
      }
    })()

    const es = new EventSource(`/api/chats/${sessionId}/stream`)
    const onMsg = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as Message
        if (payload.sessionId !== sessionId) return
        const deliveredMessage = { ...payload, deliveryStatus: 'delivered' as DeliveryStatus }
        setMessages((prev) => {
          const existingIndex = prev.findIndex((message) => message.id === payload.id)
          if (existingIndex >= 0) {
            return prev.map((message, index) => index === existingIndex ? deliveredMessage : message)
          }

          const optimisticIndex = prev.findIndex((message) =>
            message.id.startsWith('temp-') &&
            message.senderId === currentUserId &&
            message.content === payload.content
          )
          if (optimisticIndex >= 0) {
            return prev.map((message, index) => index === optimisticIndex ? deliveredMessage : message)
          }

          return [...prev, deliveredMessage]
        })
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
  }, [sessionId, currentUserId])

  async function sendMessage(content: string) {
    if (!sessionId) throw new Error('No session')
    if (!currentUserId) throw new Error('No user')

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimisticMessage: Message = {
      id: tempId,
      sessionId,
      senderId: currentUserId,
      content,
      timestamp: new Date().toISOString(),
      deliveryStatus: 'sent'
    }

    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const res = await fetch(`/api/chats/${sessionId}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      if (!res.ok) throw new Error('send failed')
      const data = await res.json()
      const deliveredMessage = { ...data.message, deliveryStatus: 'delivered' as DeliveryStatus }

      setMessages((prev) => {
        let replacedOptimisticMessage = false
        const nextMessages = prev.reduce<Message[]>((next, message) => {
          if (message.id === deliveredMessage.id) return next
          if (message.id === tempId) {
            replacedOptimisticMessage = true
            return [...next, deliveredMessage]
          }

          return [...next, message]
        }, [])

        return replacedOptimisticMessage ? nextMessages : [...nextMessages, deliveredMessage]
      })

      return deliveredMessage
    } catch (err) {
      setMessages((prev) => prev.map((message) => message.id === tempId ? { ...message, deliveryStatus: 'failed' } : message))
      throw err
    }
  }

  return { messages, sendMessage }
}
