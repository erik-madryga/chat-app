'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data?.message || 'Error')
        setLoading(false)
        return
      }
      router.push('/chats')
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold">{isSignUp ? 'Create account' : 'Sign in'}</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full p-2 border rounded" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-2 border rounded" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
          <button type="button" className="text-sm underline" onClick={() => setIsSignUp((s) => !s)}>
            {isSignUp ? 'Have an account? Sign in' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  )
}
