import {
  createClient as createSupabaseClient,
  SupabaseClient,
  User,
  Session,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create client - this will be the same on both server and client
const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export singleton instance directly
export { supabase };

// Legacy function for backward compatibility - returns the same instance
export function createClient(): SupabaseClient {
  return supabase;
}

// Export types for convenience
export type { User, Session };

/**
 * Get current session from Supabase Auth
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user from Supabase Auth
 */
export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Require authenticated user, throw if not found
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}
