"use client";

import { useAdminAuth } from "@/features/auth/useAdminAuth";
import { AdminLogin } from "@/components/auth/admin-login";
import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
  const { isAuthenticated, isAdmin, loading, signOut } = useAdminAuth();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        suppressHydrationWarning
      >
        <div className="text-center" suppressHydrationWarning>
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"
            suppressHydrationWarning
          ></div>
          <p className="text-sm text-gray-600">Verificando credenciales de administrador...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado o no es admin, mostrar login
  if (!isAuthenticated || !isAdmin) {
    return <AdminLogin />;
  }

  // Si está autenticado y es admin, mostrar dashboard
  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* Header con logout */}
      <div
        className="bg-white border-b border-gray-200 px-4 py-2"
        suppressHydrationWarning
      >
        <div className="flex justify-between items-center" suppressHydrationWarning>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">
              Admin Panel
            </h1>
            <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
              Administrator
            </div>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Dashboard principal */}
      <AdminDashboard />
    </div>
  );
}
