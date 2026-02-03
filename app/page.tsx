"use client";

import { useAuth } from "@/features/auth/useAuth";
import { OTPLogin } from "@/components/auth/otp-login";
import { CoachDashboard } from "@/components/coach-dashboard";
import { useCurrentCoachId } from "@/features/coach/messaging-hooks";
import { useCoachNotifications } from "@/hooks/useCoachNotifications";
import { UnreadBadge } from "@/components/notifications/UnreadBadge";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { Bell } from "lucide-react";
import { useState } from "react";

function DashboardHeader() {
  const { signOut } = useAuth();
  const { data: coachId } = useCurrentCoachId();
  const { totalUnread, notifications } = useCoachNotifications(coachId || null);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-semibold text-gray-900">Coach Dashboard</div>
        <div className="flex items-center gap-4">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1">
                  <UnreadBadge count={totalUnread} size="sm" />
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border z-20">
                  <NotificationsPanel 
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardWithNotifications() {
  return (
    <>
      <DashboardHeader />
      <CoachDashboard />
    </>
  );
}

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
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <DashboardWithNotifications />
    </div>
  );
}
