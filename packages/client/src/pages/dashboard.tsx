import { Header } from '@/components/header';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to your dashboard!</p>
      </div>
    </div>
  );
}
