import { Route, Routes } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Toaster } from '@/components/ui/sonner';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
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
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
