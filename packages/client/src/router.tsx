import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { DashboardPage } from './pages/dashboard';
import { LoginPage } from './pages/login';
import { useAuthStore } from './stores';

const rootRoute = createRootRoute({
  component: () => (
    <div id="root-content">
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const isAuthenticated = !!useAuthStore.getState().accessToken;
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' });
    }
    throw redirect({ to: '/login' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => {
    const accessToken = useAuthStore((state) => state.accessToken);
    if (accessToken) {
      window.location.href = '/dashboard';
      return null;
    }
    return <LoginPage />;
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => <DashboardPage />,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, dashboardRoute]);

const router = createRouter({
  routeTree,
  context: {},
});

export { router };
