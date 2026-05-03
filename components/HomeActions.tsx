'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomeActions() {
  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!mounted) return
        if (!res.ok) {
          setUser(null)
          return
        }
        const data = await res.json()
        setUser(data.user)
      } catch (err) {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setCheckingAuth(false)
      }
    }

    loadUser()

    return () => {
      mounted = false
    }
  }, [])

  if (checkingAuth) {
    return <div className="h-10 w-28 rounded bg-gray-200" />
  }

  if (user) {
    return <Link href="/chats" className="px-4 py-2 bg-blue-600 text-white rounded">Open app</Link>
  }

  return <Link href="/sign-in" className="px-4 py-2 bg-blue-600 text-white rounded">Get started</Link>
}
