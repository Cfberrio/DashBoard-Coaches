"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SimpleTest() {
  const { isAuthenticated, loading, user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState("");

  const handleSendCode = () => {
    console.log("Enviando código a:", email);
    setMessage(`Código enviado a ${email}. Usa el código: 123456`);
    setStep("code");
  };

  const handleVerifyCode = async () => {
    const { supabase } = await import("@/lib/supabaseClient");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else if (data.user) {
      setMessage("¡Login exitoso!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>¡Bienvenido!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Usuario: {user.email}</p>
            <p>ID: {user.id}</p>
            <Button onClick={signOut} variant="outline" className="w-full">
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Prueba Simple de Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "email" && (
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleSendCode} className="w-full">
                Enviar Código
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Código enviado a {email}</p>
              <Input
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button onClick={handleVerifyCode} className="w-full">
                Verificar
              </Button>
              <Button
                onClick={() => setStep("email")}
                variant="outline"
                className="w-full"
              >
                Cambiar Email
              </Button>
            </div>
          )}

          {message && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              {message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
