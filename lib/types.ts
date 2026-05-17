export interface User {
  id: string
  username: string
  passwordHash?: string
  email?: string
  googleId?: string
  authProvider?: 'password' | 'google' | 'password_google'
  createdAt: string
}
