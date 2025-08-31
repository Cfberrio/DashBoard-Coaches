"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { OTPLogin } from '@/components/auth/otp-login';
import { CoachDashboard } from '@/components/coach-dashboard';
import { CoachDataProvider } from '@/features/coach/wiring';


export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    checkAuth();

    // Suscribirse a cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verificar que sea un coach válido
        const isValidCoach = await verifyCoachAccess(session.user.id);
        setIsAuthenticated(isValidCoach);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Verificar que el usuario tenga acceso como coach
        const isValidCoach = await verifyCoachAccess(session.user.id);
        setIsAuthenticated(isValidCoach);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCoachAccess = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id')
        .eq('userid', userId)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error verifying coach access:', error);
      return false;
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <OTPLogin onSuccess={handleLoginSuccess} />;
  }

  // Si está autenticado, mostrar dashboard
  return (
    <CoachDataProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header con logout */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex justify-end">
            <button
              onClick={handleLogout}
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
