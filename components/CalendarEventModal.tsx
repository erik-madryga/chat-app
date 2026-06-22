'use client'

import { useState, useEffect } from 'react'

type Attendee = {
  id: string
  username: string
  email?: string | null
}

type CalendarEventModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  chatParticipantIds: string[]
  connectedUsers: Attendee[]
  googleCalendarConnected: boolean
  authProvider: string
}

export default function CalendarEventModal({
  isOpen,
  onClose,
  onCreated,
  chatParticipantIds,
  connectedUsers,
  googleCalendarConnected,
  authProvider
}: CalendarEventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ eventLink?: string } | null>(null)

  // Initialize with default start/end times and pre-selected chat participants
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      // Round to next hour
      now.setMinutes(0, 0, 0)
      now.setHours(now.getHours() + 1)
      const end = new Date(now.getTime() + 60 * 60 * 1000)

      setStartDateTime(toLocalDatetimeString(now))
      setEndDateTime(toLocalDatetimeString(end))
      setSelectedUserIds(chatParticipantIds.filter((id) => connectedUsers.some((u) => u.id === id)))
      setTitle('')
      setDescription('')
      setError('')
      setSuccess(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function toLocalDatetimeString(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  function handleStartChange(value: string) {
    setStartDateTime(value)
    // Auto-adjust end to 1 hour after start if end is before new start
    if (value) {
      const startDate = new Date(value)
      const endDate = new Date(endDateTime)
      if (!endDateTime || endDate.getTime() <= startDate.getTime()) {
        const newEnd = new Date(startDate.getTime() + 60 * 60 * 1000)
        setEndDateTime(toLocalDatetimeString(newEnd))
      }
    }
  }

  function toggleAttendee(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
          attendeeUserIds: selectedUserIds
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message || 'Failed to create event')
        return
      }

      const data = await res.json()
      setSuccess({ eventLink: data.event?.googleEventLink })
      onCreated()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-950">Schedule Event</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-5">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Event created!</span>
              </div>
              {success.eventLink && (
                <a
                  href={success.eventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 underline hover:text-blue-800"
                >
                  Open in Google Calendar →
                </a>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label htmlFor="event-title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project standup"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label htmlFor="event-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                rows={2}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="event-start" className="block text-sm font-medium text-gray-700">Start</label>
                <input
                  id="event-start"
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => handleStartChange(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="event-end" className="block text-sm font-medium text-gray-700">End</label>
                <input
                  id="event-end"
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {connectedUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Invite</label>
                <div className="max-h-36 overflow-auto rounded border border-gray-200 divide-y divide-gray-100">
                  {connectedUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleAttendee(user.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800">{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {googleCalendarConnected && (
              <div className="flex items-center gap-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Will also create on your Google Calendar
              </div>
            )}

            {!googleCalendarConnected && (authProvider === 'google' || authProvider === 'password_google') && (
              <div className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">Sync events to Google Calendar?</span>
                <a
                  href="/api/auth/google/calendar"
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Connect
                </a>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className={`flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${
                  loading || !title.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
