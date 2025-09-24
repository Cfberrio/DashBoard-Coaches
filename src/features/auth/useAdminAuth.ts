import { useEffect, useState } from "react";
import { supabase, User, Session } from "@/lib/supabaseClient";

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function useAdminAuth() {
  const [authState, setAuthState] = useState<AdminAuthState>({
    user: null,
    session: null,
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
  });

  useEffect(() => {
    let mounted = true;

    const checkAdminAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          // Verificar si el usuario es admin
          let isAdmin = false;
          if (session?.user) {
            // Lista temporal de emails admin hasta que se configure RLS correctamente
            const adminEmails = [
              "admin@disciplinerift.com"
            ];
            isAdmin = session.user.email ? adminEmails.includes(session.user.email) : false;
          }

          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
            isAuthenticated: !!session?.user,
            isAdmin,
          });
        }
      } catch {
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAuthenticated: false,
            isAdmin: false,
          });
        }
      }
    };

    // Check auth and listen for changes
    checkAdminAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        // Verificar si el usuario es admin
        let isAdmin = false;
        if (session?.user) {
          // Lista temporal de emails admin hasta que se configure RLS correctamente
          const adminEmails = [
            "admin@disciplinerift.com"
          ];
          isAdmin = session.user.email ? adminEmails.includes(session.user.email) : false;
        }

        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          isAuthenticated: !!session?.user,
          isAdmin,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Verificar si el usuario es admin usando la tabla admin
      if (data.user) {
        // Lista temporal de emails admin hasta que se configure RLS correctamente
        const adminEmails = [
          "admin@disciplinerift.com"
        ];

        const isAdminEmail = data.user.email ? adminEmails.includes(data.user.email) : false;

        if (!isAdminEmail) {
          await supabase.auth.signOut();
          throw new Error("Access denied: Admin privileges required");
        }

        // Intentar verificar en la base de datos también (para logging)
        try {
          const { data: adminData, error: roleError } = await supabase
            .from("admin")
            .select("email")
            .eq("email", data.user.email);

          console.log("Admin check for email:", data.user.email);
          console.log("Admin data from DB:", adminData);
          console.log("Role error:", roleError);
        } catch (dbError) {
          console.warn("Could not verify admin in database (RLS issue?):", dbError);
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Silently handle sign out errors
    }
  };

  return {
    ...authState,
    signInWithPassword,
    signOut,
  };
}
