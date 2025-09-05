"use client";

import { useAuth } from "@/features/auth/useAuth";
import { OTPLogin } from "@/components/auth/otp-login";
import { CoachDashboard } from "@/components/coach-dashboard";
import { CoachDataProvider } from "@/features/coach/wiring";

export default function Home() {
  const { isAuthenticated, loading, signOut } = useAuth();

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
          <p className="text-sm text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <OTPLogin />;
  }

  // Si está autenticado, mostrar dashboard
  return (
    <CoachDataProvider>
      <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
        {/* Header con logout */}
        <div
          className="bg-white border-b border-gray-200 px-4 py-2"
          suppressHydrationWarning
        >
          <div className="flex justify-end" suppressHydrationWarning>
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Dashboard principal */}
        <CoachDashboard />
      </div>
    </CoachDataProvider>
  );
}
