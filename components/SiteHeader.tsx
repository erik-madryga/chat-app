'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
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
  }, [pathname])

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const sectionHref = (hash: string) => pathname === '/' ? hash : `/${hash}`

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 py-4">
      <Link href="/" className="text-lg font-semibold text-gray-950">Chat App</Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <Link href={sectionHref('#features')} className="hover:text-gray-950">Features</Link>
        <Link href={sectionHref('#how-it-works')} className="hover:text-gray-950">How it works</Link>
        <Link href={sectionHref('#privacy')} className="hover:text-gray-950">Privacy</Link>
        {user && pathname !== '/chats' && <Link href="/chats" className="hover:text-gray-950">Open app</Link>}
        {!checkingAuth && user && (
          <button onClick={handleSignOut} className="px-3 py-2 text-gray-700 rounded hover:bg-gray-100">Sign out</button>
        )}
        {!checkingAuth && !user && pathname !== '/sign-in' && (
          <Link href="/sign-in" className="px-3 py-2 bg-blue-600 text-white rounded">Sign in</Link>
        )}
      </nav>
    </header>
  )
}
