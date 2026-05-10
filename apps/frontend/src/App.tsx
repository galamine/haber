import { Route, Routes } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Toaster } from '@/components/ui/sonner';
import { LoginPage } from '@/pages/auth/LoginPage';
import { MyClinicPage } from '@/pages/clinic/MyClinicPage';
import { ClinicSetupPage } from '@/pages/clinic-admin/setup/ClinicSetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StaffDetailPage } from '@/pages/StaffDetailPage';
import { StaffPage } from '@/pages/StaffPage';
import { ClinicFormPage } from '@/pages/super-admin/clinics/ClinicFormPage';
import { ClinicListPage } from '@/pages/super-admin/clinics/ClinicListPage';
import { SubscriptionPlanFormPage } from '@/pages/super-admin/subscription-plans/SubscriptionPlanFormPage';
import { SubscriptionPlanListPage } from '@/pages/super-admin/subscription-plans/SubscriptionPlanListPage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';
import { UserListPage } from '@/pages/users/UserListPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <PageShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UserListPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route
            path="staff"
            element={
              <ProtectedRoute requiredRoles={['clinic_admin']}>
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="staff/:userId"
            element={
              <ProtectedRoute requiredRoles={['clinic_admin']}>
                <StaffDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/clinics"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <ClinicListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/clinics/new"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <ClinicFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/clinics/:clinicId/edit"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <ClinicFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/subscription-plans"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <SubscriptionPlanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/subscription-plans/new"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <SubscriptionPlanFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="super-admin/subscription-plans/:planId/edit"
            element={
              <ProtectedRoute requiredRoles={['super_admin']}>
                <SubscriptionPlanFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clinic/me"
            element={
              <ProtectedRoute requiredRoles={['clinic_admin']}>
                <MyClinicPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clinic/setup"
            element={
              <ProtectedRoute requiredRoles={['clinic_admin']}>
                <ClinicSetupPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
