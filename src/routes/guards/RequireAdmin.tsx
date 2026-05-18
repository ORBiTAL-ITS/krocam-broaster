import type { ReactNode } from 'react'
import { Redirect } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'
import { usePermissions } from '../../hooks/usePermissions'
import { ROUTES } from '../paths'

interface RequireAdminProps {
  children: ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { loading, isAuthenticated, isAdmin } = usePermissions()

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Redirect to={ROUTES.LOGIN} />
  }

  if (!isAdmin) {
    return <Redirect to={ROUTES.HOME} />
  }

  return <>{children}</>
}
