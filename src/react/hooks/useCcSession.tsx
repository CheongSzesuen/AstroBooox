import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type SessionUser = {
  login: string
  avatar_url?: string
}

type CcSessionContextValue = {
  token: string
  currentUser: string
  avatarUrl: string
  isAuthenticated: boolean
  setToken: (value: string) => void
  setSessionUser: (user: SessionUser) => void
  clearSessionUser: () => void
  clearSession: () => void
}

const CcSessionContext = createContext<CcSessionContextValue | null>(null)

export function CcSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const value = useMemo<CcSessionContextValue>(
    () => ({
      token,
      currentUser,
      avatarUrl,
      isAuthenticated: Boolean(token.trim() && currentUser),
      setToken,
      setSessionUser: (user) => {
        setCurrentUser(user.login)
        setAvatarUrl(user.avatar_url || '')
      },
      clearSessionUser: () => {
        setCurrentUser('')
        setAvatarUrl('')
      },
      clearSession: () => {
        setToken('')
        setCurrentUser('')
        setAvatarUrl('')
      }
    }),
    [avatarUrl, currentUser, token]
  )

  return <CcSessionContext.Provider value={value}>{children}</CcSessionContext.Provider>
}

export function useCcSession() {
  const context = useContext(CcSessionContext)
  if (!context) {
    throw new Error('useCcSession 必须在 CcSessionProvider 内使用')
  }
  return context
}
