import type { ReactNode } from 'react'
import { Redirect, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../paths'

interface GuestOnlyProps {
  children: ReactNode
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const rawRedirect = params.get('redirect')
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : ROUTES.HOME

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Redirect to={redirectTo} />
  }

  return <>{children}</>
}
