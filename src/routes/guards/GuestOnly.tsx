import type { ReactNode } from 'react'
import { Redirect, useLocation } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { useAuth } from '../../context/AuthContext'
import { loginRedirectFromSearch } from '../paths'

interface GuestOnlyProps {
  children: ReactNode
}

export function GuestOnly({ children }: GuestOnlyProps) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const redirectTo = loginRedirectFromSearch(location.search)

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Redirect to={redirectTo} />
  }

  return <>{children}</>
}
