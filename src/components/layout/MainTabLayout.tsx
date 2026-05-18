import { IonRouterOutlet, IonTabs } from '@ionic/react'
import { Redirect, Route } from 'react-router-dom'
import { useShowBottomTabs } from '../../hooks/useShowBottomTabs'
import AccountPage from '../../features/account/AccountPage'
import AdminPage from '../../features/admin/AdminPage'
import MenuPage from '../../features/menu/MenuPage'
import MyOrdersPage from '../../features/menu/MyOrdersPage'
import { RequireAdmin } from '../../routes/guards/RequireAdmin'
import { RequireAuth } from '../../routes/guards/RequireAuth'
import { ROUTES } from '../../routes/paths'
import { AppBottomTabBar } from './AppBottomTabBar'

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

export function MainTabLayout() {
  const showBottomTabs = useShowBottomTabs()

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path={ROUTES.HOME} component={MenuPageRoute} />
        <Route exact path={ROUTES.ORDERS}>
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        </Route>
        <Route exact path={ROUTES.ACCOUNT}>
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        </Route>
        <Route exact path={ROUTES.MENU_EDIT}>
          <RequireAdmin>
            <MenuPageRoute editMode />
          </RequireAdmin>
        </Route>
        <Route exact path={ROUTES.ADMIN_ORDERS}>
          <RequireAdmin>
            <AdminOrdersRoute />
          </RequireAdmin>
        </Route>
        <Redirect to={ROUTES.HOME} />
      </IonRouterOutlet>
      {showBottomTabs && <AppBottomTabBar />}
    </IonTabs>
  )
}
