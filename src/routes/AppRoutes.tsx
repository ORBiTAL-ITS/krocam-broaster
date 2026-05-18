import { Route, Switch } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import AdminReviewsPage from '../features/admin/AdminReviewsPage'
import NotificationsPage from '../features/notifications/NotificationsPage'
import PrivacyPolicyPage from '../features/legal/PrivacyPolicyPage'
import TermsPage from '../features/legal/TermsPage'
import ContactPage from '../features/legal/ContactPage'
import AboutPage from '../features/legal/AboutPage'
import { MainTabLayout } from '../components/layout/MainTabLayout'
import { GuestOnly } from './guards/GuestOnly'
import { RequireAdmin } from './guards/RequireAdmin'
import { RequireAuth } from './guards/RequireAuth'
import { ROUTES } from './paths'

function NotificationsRoute() {
  return <NotificationsPage />
}

export function AppRoutes() {
  return (
    <Switch>
      <Route exact path={ROUTES.PRIVACY} component={PrivacyPolicyPage} />
      <Route exact path={ROUTES.TERMS} component={TermsPage} />
      <Route exact path={ROUTES.CONTACT} component={ContactPage} />
      <Route exact path={ROUTES.ABOUT} component={AboutPage} />
      <Route exact path={ROUTES.LOGIN}>
        <GuestOnly>
          <LoginPage />
        </GuestOnly>
      </Route>
      <Route exact path={ROUTES.NOTIFICATIONS}>
        <RequireAuth>
          <NotificationsRoute />
        </RequireAuth>
      </Route>
      <Route exact path={ROUTES.ADMIN_REVIEWS}>
        <RequireAdmin>
          <AdminReviewsPage />
        </RequireAdmin>
      </Route>
      <Route>
        <MainTabLayout />
      </Route>
    </Switch>
  )
}
