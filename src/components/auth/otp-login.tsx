"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Mail, Key } from "lucide-react";

interface LoginState {
  step: "email" | "otp" | "success";
  email: string;
  otp: string;
  loading: boolean;
  error: string | null;
  message: string | null;
}

export function OTPLogin() {
  const [state, setState] = useState<LoginState>({
    step: "email",
    email: "",
    otp: "",
    loading: false,
    error: null,
    message: null,
  });

  const sendOTP = async () => {
    if (!state.email.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter your email" }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Force OTP email specifically
      const { error } = await supabase.auth.signInWithOtp({
        email: state.email.trim(),
        options: {
          shouldCreateUser: false,
          data: {},
        },
      });

      if (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: `Error sending code: ${error.message}`,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        step: "otp",
        message: `OTP code sent to ${state.email}. Check your inbox.`,
        error: null,
      }));
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }));
    }
  };

  const verifyOTP = async () => {
    if (!state.otp.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter the code" }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: state.email,
        token: state.otp.trim(),
        type: "email",
      });

      if (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: `Invalid code: ${error.message}`,
        }));
        return;
      }

      if (data.user) {
        setState((prev) => ({
          ...prev,
          loading: false,
          step: "success",
          message: `Welcome!`,
          error: null,
        }));

        // Reload the page to update authentication state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      }));
    }
  };

  const resetForm = () => {
    setState({
      step: "email",
      email: "",
      otp: "",
      loading: false,
      error: null,
      message: null,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && !state.loading) {
      action();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Dashboard Coach
          </CardTitle>
          <p className="text-gray-600">
            {state.step === "email" &&
              "Enter your email to receive a code"}
            {state.step === "otp" && "Enter the code sent to your email"}
            {state.step === "success" && "Login successful!"}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.step === "email" && (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="coach@example.com"
                  value={state.email}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      email: e.target.value,
                      error: null,
                    }))
                  }
                  onKeyPress={(e) => handleKeyPress(e, sendOTP)}
                  className="pl-10"
                  disabled={state.loading}
                />
              </div>
              <Button
                onClick={sendOTP}
                className="w-full"
                disabled={state.loading}
              >
                {state.loading ? "Sending..." : "Send Code"}
              </Button>
            </div>
          )}

          {state.step === "otp" && (
            <div className="space-y-4">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="123456"
                  value={state.otp}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      otp: e.target.value,
                      error: null,
                    }))
                  }
                  onKeyPress={(e) => handleKeyPress(e, verifyOTP)}
                  className="pl-10 text-center text-lg tracking-widest"
                  maxLength={6}
                  disabled={state.loading}
                />
              </div>
              <div className="space-y-2">
                <Button
                  onClick={verifyOTP}
                  className="w-full"
                  disabled={state.loading}
                >
                  {state.loading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="w-full"
                  disabled={state.loading}
                >
                  Change Email
                </Button>
              </div>
            </div>
          )}

          {state.step === "success" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <p className="text-green-600 font-medium">
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {state.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          {state.message && !state.error && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              <span className="text-sm">{state.message}</span>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 mt-6">
            Only registered coaches can access the system
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
