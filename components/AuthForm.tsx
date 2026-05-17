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

  const passwordChecks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }

  const allPasswordValid = Object.values(passwordChecks).every(Boolean)

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'

    // If signing up, ensure password requirements are met before submitting
    if (isSignUp && !allPasswordValid) {
      setError('Password does not meet the requirements.')
      setLoading(false)
      return
    }

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
        {isSignUp && (
          <div className="text-sm mt-2" aria-live="polite">
            <p className="font-medium">Password requirements:</p>
            <ul className="mt-1 space-y-1">
              <li className={passwordChecks.length ? 'text-green-600 flex items-center' : 'text-gray-600 flex items-center'}>
                <span className="inline-block w-4 mr-2">{passwordChecks.length ? '✓' : '•'}</span>
                Minimum 8 characters
              </li>
              <li className={passwordChecks.uppercase ? 'text-green-600 flex items-center' : 'text-gray-600 flex items-center'}>
                <span className="inline-block w-4 mr-2">{passwordChecks.uppercase ? '✓' : '•'}</span>
                At least one uppercase letter
              </li>
              <li className={passwordChecks.lowercase ? 'text-green-600 flex items-center' : 'text-gray-600 flex items-center'}>
                <span className="inline-block w-4 mr-2">{passwordChecks.lowercase ? '✓' : '•'}</span>
                At least one lowercase letter
              </li>
              <li className={passwordChecks.number ? 'text-green-600 flex items-center' : 'text-gray-600 flex items-center'}>
                <span className="inline-block w-4 mr-2">{passwordChecks.number ? '✓' : '•'}</span>
                At least one number
              </li>
              <li className={passwordChecks.special ? 'text-green-600 flex items-center' : 'text-gray-600 flex items-center'}>
                <span className="inline-block w-4 mr-2">{passwordChecks.special ? '✓' : '•'}</span>
                At least one special character (e.g. !@#$%)
              </li>
            </ul>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded ${loading || (isSignUp && !allPasswordValid) ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading || (isSignUp && !allPasswordValid)}
          >
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
