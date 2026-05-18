import { useAuth } from '../context/AuthContext'

export function usePermissions() {
  const { user, profile, profileLoading, loading } = useAuth()

  const isAuthenticated = user != null
  const isAdmin = profile?.role === 'admin'
  const hasDeliveryProfile =
    !!profile &&
    profile.phone.trim().length > 0 &&
    profile.barrio.trim().length > 0 &&
    profile.address.trim().length > 0

  return {
    loading: loading || (isAuthenticated && profileLoading),
    isAuthenticated,
    isAdmin,
    hasDeliveryProfile,
    canEditMenu: isAdmin,
    canAccessOrdersAdmin: isAdmin,
    canModerateReviews: isAdmin,
    canPostReview: isAuthenticated,
    canPlaceOrder: isAuthenticated && hasDeliveryProfile,
  }
}
