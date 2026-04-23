import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Chat App',
  description: 'Simple chat app'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="container mx-auto p-4">{children}</div>
      </body>
    </html>
  )
}
