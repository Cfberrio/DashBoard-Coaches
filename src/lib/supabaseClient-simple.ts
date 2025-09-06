// Cliente Supabase simplificado que solo funciona en el navegador
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente básico usando fetch
export class SimpleSupabaseClient {
  private url: string;
  private key: string;
  private authToken: string | null = null;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
    
    // Recuperar token del localStorage si existe
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('supabase_token');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.authToken || this.key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.url}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${error}`);
    }

    return response.json();
  }

  // Método para consultas SELECT
  from(table: string) {
    return {
      select: (columns = '*') => ({
        eq: (column: string, value: string | number | boolean) => ({
          single: async () => {
            const data = await this.makeRequest(
              `/rest/v1/${table}?select=${columns}&${column}=eq.${value}&limit=1`
            );
            return { data: data[0] || null, error: null };
          },
          execute: async () => {
            const data = await this.makeRequest(
              `/rest/v1/${table}?select=${columns}&${column}=eq.${value}`
            );
            return { data, error: null };
          }
        }),
        in: (column: string, values: (string | number | boolean)[]) => ({
          execute: async () => {
            const valueStr = values.map(v => `"${v}"`).join(',');
            const data = await this.makeRequest(
              `/rest/v1/${table}?select=${columns}&${column}=in.(${valueStr})`
            );
            return { data, error: null };
          }
        }),
        execute: async () => {
          const data = await this.makeRequest(
            `/rest/v1/${table}?select=${columns}`
          );
          return { data, error: null };
        }
      })
    };
  }

  // Método para autenticación con OTP
  auth = {
    signInWithOtp: async (options: { email: string }) => {
      try {
        await this.makeRequest('/auth/v1/otp', {
          method: 'POST',
          body: JSON.stringify({
            email: options.email,
            create_user: false
          })
        });
        return { error: null };
      } catch (error) {
        return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },

    verifyOtp: async (options: { email: string; token: string; type: string }) => {
      try {
        const data = await this.makeRequest('/auth/v1/verify', {
          method: 'POST',
          body: JSON.stringify({
            email: options.email,
            token: options.token,
            type: options.type
          })
        });
        
        if (data.access_token) {
          this.authToken = data.access_token;
          if (typeof window !== 'undefined') {
            localStorage.setItem('supabase_token', data.access_token);
          }
        }
        
        return { data: { user: data.user }, error: null };
      } catch (error) {
        return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },

    getUser: async () => {
      if (!this.authToken) {
        return { data: { user: null }, error: null };
      }
      
      try {
        const data = await this.makeRequest('/auth/v1/user');
        return { data: { user: data }, error: null };
      } catch (error) {
        return { data: { user: null }, error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    },

    signOut: async () => {
      this.authToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase_token');
      }
      return { error: null };
    },

    onAuthStateChange: (callback: (event: string, session: { access_token: string } | null) => void) => {
      // Implementación básica que solo detecta cambios en localStorage
      let lastToken = this.authToken;
      
      const checkAuth = () => {
        if (typeof window !== 'undefined') {
          const currentToken = localStorage.getItem('supabase_token');
          if (currentToken !== lastToken) {
            lastToken = currentToken;
            this.authToken = currentToken;
            callback(currentToken ? 'SIGNED_IN' : 'SIGNED_OUT', 
              currentToken ? { access_token: currentToken } : null);
          }
        }
      };

      const interval = setInterval(checkAuth, 1000);
      
      return {
        data: {
          subscription: {
            unsubscribe: () => clearInterval(interval)
          }
        }
      };
    }
  };
}

export function createClient() {
  return new SimpleSupabaseClient(supabaseUrl, supabaseAnonKey);
}

// Singleton client
export const supabase = createClient();

// Tipos básicos
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  user: User;
}




