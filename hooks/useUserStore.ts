import create from 'zustand'

type User = { id: string; username: string } | null

interface UserState {
  user: User
  setUser: (u: User) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  clearUser: () => set({ user: null })
}))
