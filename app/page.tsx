import Link from 'next/link'

export default function Home() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-bold">Chat App</h1>
      <p className="mt-4">Sign in to view your chats.</p>
      <div className="mt-6">
        <Link href="/sign-in" className="px-4 py-2 bg-blue-600 text-white rounded">Sign In</Link>
      </div>
    </main>
  )
}
