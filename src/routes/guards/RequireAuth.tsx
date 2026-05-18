import type { ReactNode } from 'react'
import { Redirect, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from '../../context/AuthContext'
import { loginPath } from '../paths'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Redirect to={loginPath(location.pathname + location.search)} />
  }

  return <>{children}</>
}
