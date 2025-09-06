"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthDebug() {
  const [email, setEmail] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuthFlow = async () => {
    if (!email.trim()) return;

    setLoading(true);
    setResults(null);

    const testResults = {
      step1_userExists: null,
      step2_staffExists: null,
      step3_otpTest: null,
      recommendations: [],
    };

    try {
      // Step 1: Check if user exists in auth.users
      setResults({ ...testResults, step1_userExists: "Verificando..." });

      // We can't directly query auth.users, but we can try OTP and see the error
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
      });

      testResults.step3_otpTest = otpError
        ? {
            success: false,
            error: otpError.message,
            code: otpError.status,
          }
        : {
            success: true,
            message: "OTP enviado exitosamente",
          };

      // Step 2: Check if staff record exists
      setResults({ ...testResults, step2_staffExists: "Verificando..." });

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name, email")
        .ilike("email", email.trim())
        .single();

      testResults.step2_staffExists = staffError
        ? {
            success: false,
            error: staffError.message,
          }
        : {
            success: true,
            data: staffData,
          };

      // Generate recommendations
      if (otpError?.message.includes("Signups not allowed")) {
        testResults.recommendations.push(
          "El usuario no existe en auth.users. Necesitas crear el usuario manualmente en Supabase Auth."
        );
      }

      if (!staffData) {
        testResults.recommendations.push(
          "No se encontró registro de staff con este email. Verifica que el coach esté creado en la tabla staff."
        );
      }

      if (staffData && !staffData.id) {
        testResults.recommendations.push(
          "El staff existe pero no tiene id válido. Verifica que el registro de staff esté correctamente configurado."
        );
      }

      if (!otpError && staffData && staffData.id) {
        testResults.recommendations.push(
          "✅ Todo parece estar configurado correctamente. El login debería funcionar."
        );
      }
    } catch (error: any) {
      testResults.step3_otpTest = {
        success: false,
        error: error.message,
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Diagnóstico de Autenticación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@coach.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={testAuthFlow} disabled={loading || !email.trim()}>
            {loading ? "Testing..." : "Test"}
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            <div className="border rounded p-3">
              <h4 className="font-medium">Resultado OTP:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2">
                {JSON.stringify(results.step3_otpTest, null, 2)}
              </pre>
            </div>

            <div className="border rounded p-3">
              <h4 className="font-medium">Staff en Base de Datos:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2">
                {JSON.stringify(results.step2_staffExists, null, 2)}
              </pre>
            </div>

            {results.recommendations.length > 0 && (
              <div className="border rounded p-3 bg-blue-50">
                <h4 className="font-medium">Recomendaciones:</h4>
                <ul className="mt-2 text-sm space-y-1">
                  {results.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-blue-800">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p>
            <strong>Pasos para solucionar:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Crear usuario en Supabase Auth si no existe</li>
            <li>Asegurar que staff.id = auth.user.id</li>
            <li>Verificar que el email coincida en ambas tablas</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
