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
      <a
        href="/api/auth/google"
        className="mt-4 flex w-full items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Continue with Google
      </a>
      <div className="my-4 flex items-center gap-3 text-xs uppercase text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        <span>or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
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
