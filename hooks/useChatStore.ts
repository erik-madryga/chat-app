import create from 'zustand'

export type SessionSummary = { sessionId: string; participantIds: string[]; lastMessagePreview?: string; updatedAt?: string; messageCount?: number }

interface ChatState {
  sessions: SessionSummary[]
  activeSessionId: string | null
  setSessions: (s: SessionSummary[]) => void
  setActiveSessionId: (id: string | null) => void
  updateSession: (session: SessionSummary) => void
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  setSessions: (s) => set({ sessions: s }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  updateSession: (session) => set((state) => {
    const idx = state.sessions.findIndex((x) => x.sessionId === session.sessionId)
    if (idx >= 0) {
      const sessions = [...state.sessions]
      sessions[idx] = session
      return { sessions }
    }
    return { sessions: [session, ...state.sessions] }
  })
}))
