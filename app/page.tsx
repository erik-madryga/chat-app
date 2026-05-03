import HomeActions from '../components/HomeActions'

const features = [
  {
    title: 'Chat after connecting',
    description: 'Search for people by username, send a connection request, and start a conversation once they accept.'
  },
  {
    title: 'Clear message state',
    description: 'Messages appear right away with sent and delivered states, so conversations feel responsive.'
  },
  {
    title: 'Focused contact list',
    description: 'Your available users list stays limited to accepted connections and existing conversations.'
  }
]

const steps = [
  'Create an account or sign in.',
  'Find a user and send a connection request.',
  'Accept incoming requests and start chatting.'
]

export default function Home() {
  return (
    <main className="pb-12">
      <section className="py-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-normal text-gray-950 sm:text-5xl">Simple private chats with people you choose.</h1>
          <p className="mt-4 text-lg text-gray-600">
            Chat App is for one-to-one conversations built around connection requests, accepted contacts, and clear message status.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <HomeActions />
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded border border-gray-200 bg-white shadow">
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            <div className="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
              <div className="text-xs font-medium uppercase text-gray-500">Connections</div>
              <div className="mt-4 space-y-2">
                <div className="rounded border border-blue-100 bg-blue-50 p-3">
                  <div className="text-sm font-medium text-gray-950">alex</div>
                  <div className="text-xs text-gray-500">Delivered just now</div>
                </div>
                <div className="rounded border border-gray-200 bg-white p-3">
                  <div className="text-sm font-medium text-gray-950">morgan</div>
                  <div className="text-xs text-gray-500">Connection accepted</div>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-medium text-gray-950">sam</div>
                  <div className="text-xs text-gray-500">Request pending</div>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <div className="text-sm font-semibold text-gray-950">alex</div>
                  <div className="text-xs text-green-700">Connected</div>
                </div>
                <div className="text-xs text-gray-500">Private chat</div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="max-w-md rounded bg-gray-100 p-3 text-sm text-gray-800">Want to review the launch checklist?</div>
                <div className="ml-auto max-w-md rounded bg-blue-50 p-3 text-sm text-gray-900">
                  Yes, I sent the latest notes.
                  <div className="mt-2 text-xs text-gray-500">Delivered</div>
                </div>
                <div className="ml-auto max-w-md rounded bg-blue-50 p-3 text-sm text-gray-900">
                  I can follow up after lunch.
                  <div className="mt-2 text-xs text-gray-500">Sent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-gray-200 py-10">
        <h2 className="text-2xl font-semibold text-gray-950">What It Helps With</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-950">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-t border-gray-200 py-10">
        <h2 className="text-2xl font-semibold text-gray-950">How It Works</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded border border-gray-200 bg-white p-4">
              <div className="text-sm font-semibold text-blue-700">Step {index + 1}</div>
              <p className="mt-2 text-sm text-gray-700">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="privacy" className="border-t border-gray-200 py-10">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-gray-950">Built Around Intentional Access</h2>
          <p className="mt-3 text-gray-600">
            Users are not added to your chat list automatically. You choose who to request, incoming requests can be accepted or declined, and sent requests can be canceled.
          </p>
        </div>
      </section>
    </main>
  )
}
