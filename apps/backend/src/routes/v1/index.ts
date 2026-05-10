import { Router } from 'express';
import authRoute from './auth.route';
import clinicRoute from './clinic.route';
import docsRoute from './docs.route';
import superAdminRoute from './superAdmin.route';
import userRoute from './user.route';

const router = Router();

interface Route {
  path: string;
  route: Router;
}

const defaultRoutes: Route[] = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/docs',
    route: docsRoute,
  },
  {
    path: '/super-admin',
    route: superAdminRoute,
  },
  {
    path: '/clinic',
    route: clinicRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
