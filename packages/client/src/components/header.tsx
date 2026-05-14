import { api } from '@/lib/api';
import { useAuthStore } from '@/stores';

export function Header() {
  const { accessToken, clearTokens } = useAuthStore();

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        await api.auth.logout.mutate({ refreshToken });
      } catch {}
    }
    clearTokens();
    window.location.href = '/login';
  };

  if (!accessToken) {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Haber Full</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
