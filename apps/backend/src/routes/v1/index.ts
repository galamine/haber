import { Router } from 'express';
import authRoute from './auth.route';
import clinicRoute from './clinic.route';
import departmentRoute from './department.route';
import docsRoute from './docs.route';
import sensoryRoomRoute from './sensoryRoom.route';
import staffRoute from './staff.route';
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
    path: '/staff',
    route: staffRoute,
  },
  {
    path: '/super-admin',
    route: superAdminRoute,
  },
  {
    path: '/clinic',
    route: clinicRoute,
  },
  {
    path: '/departments',
    route: departmentRoute,
  },
  {
    path: '/sensory-rooms',
    route: sensoryRoomRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
