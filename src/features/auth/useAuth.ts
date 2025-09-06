import { useEffect, useState } from "react";
import { supabase, User, Session } from "@/lib/supabaseClient";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
            isAuthenticated: !!session?.user,
          });
        }
      } catch (error) {
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    // Check auth and listen for changes
    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          isAuthenticated: !!session?.user,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Silently handle sign out errors
    }
  };

  return {
    ...authState,
    signOut,
  };
}
