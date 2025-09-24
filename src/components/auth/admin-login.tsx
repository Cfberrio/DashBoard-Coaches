"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Mail, Lock, Shield } from "lucide-react";
import { useAdminAuth } from "@/features/auth/useAdminAuth";

interface LoginState {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
}

export function AdminLogin() {
  const { signInWithPassword } = useAdminAuth();
  const [state, setState] = useState<LoginState>({
    email: "",
    password: "",
    loading: false,
    error: null,
  });

  const handleLogin = async () => {
    if (!state.email.trim() || !state.password.trim()) {
      setState((prev) => ({ 
        ...prev, 
        error: "Please enter both email and password" 
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await signInWithPassword(
        state.email.trim(),
        state.password.trim()
      );

      if (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Login failed",
        }));
        return;
      }

      // Success - the auth state will update automatically
      setState((prev) => ({ ...prev, loading: false }));
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unexpected error occurred",
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !state.loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Dashboard
          </CardTitle>
          <p className="text-gray-600">
            Sign in with your admin credentials
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="admin@example.com"
                value={state.email}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    email: e.target.value,
                    error: null,
                  }))
                }
                onKeyPress={handleKeyPress}
                className="pl-10"
                disabled={state.loading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Enter your password"
                value={state.password}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    password: e.target.value,
                    error: null,
                  }))
                }
                onKeyPress={handleKeyPress}
                className="pl-10"
                disabled={state.loading}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full"
              disabled={state.loading}
            >
              {state.loading ? "Signing in..." : "Sign In"}
            </Button>
          </div>

          {state.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 mt-6">
            Admin access only - Contact system administrator for credentials
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
