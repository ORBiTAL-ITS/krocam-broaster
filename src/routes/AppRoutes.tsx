import { Redirect, Route, Switch } from 'react-router-dom'
import MenuPage from '../features/menu/MenuPage'
import LoginPage from '../features/auth/LoginPage'
import AdminPage from '../features/admin/AdminPage'
import AdminReviewsPage from '../features/admin/AdminReviewsPage'
import MyOrdersPage from '../features/menu/MyOrdersPage'
import NotificationsPage from '../features/notifications/NotificationsPage'
import PrivacyPolicyPage from '../features/legal/PrivacyPolicyPage'
import TermsPage from '../features/legal/TermsPage'
import ContactPage from '../features/legal/ContactPage'
import AboutPage from '../features/legal/AboutPage'
import AccountPage from '../features/account/AccountPage'
import { GuestOnly } from './guards/GuestOnly'
import { RequireAdmin } from './guards/RequireAdmin'
import { RequireAuth } from './guards/RequireAuth'
import { ROUTES } from './paths'

function MenuPageRoute({ editMode = false }: { editMode?: boolean }) {
  return <MenuPage editMode={editMode} />
}

function AdminOrdersRoute() {
  return (
    <AdminPage
      onClosePath={ROUTES.HOME}
      notificationsReturnPath={ROUTES.ADMIN_ORDERS}
    />
  )
}

function MyOrdersRoute() {
  return <MyOrdersPage onClosePath={ROUTES.HOME} />
}

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
      <Route exact path={ROUTES.HOME}>
        <MenuPageRoute />
      </Route>
      <Route exact path={ROUTES.MENU_EDIT}>
        <RequireAdmin>
          <MenuPageRoute editMode />
        </RequireAdmin>
      </Route>
      <Route exact path={ROUTES.ORDERS}>
        <RequireAuth>
          <MyOrdersRoute />
        </RequireAuth>
      </Route>
      <Route exact path={ROUTES.NOTIFICATIONS}>
        <RequireAuth>
          <NotificationsRoute />
        </RequireAuth>
      </Route>
      <Route exact path={ROUTES.ACCOUNT}>
        <RequireAuth>
          <AccountPage />
        </RequireAuth>
      </Route>
      <Route exact path={ROUTES.ADMIN_ORDERS}>
        <RequireAdmin>
          <AdminOrdersRoute />
        </RequireAdmin>
      </Route>
      <Route exact path={ROUTES.ADMIN_REVIEWS}>
        <RequireAdmin>
          <AdminReviewsPage />
        </RequireAdmin>
      </Route>
      <Redirect to={ROUTES.HOME} />
    </Switch>
  )
}
