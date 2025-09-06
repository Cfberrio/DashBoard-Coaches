"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DebugConnection() {
  const [status, setStatus] = useState<string>("Conectando...");
  const [error, setError] = useState<string | null>(null);
  const [viewsData, setViewsData] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test 1: Basic connection
      setStatus("Probando conexión básica...");
      const { data: healthCheck, error: healthError } = await supabase
        .from("staff")
        .select("count")
        .limit(1);

      if (healthError) {
        throw new Error(`Error de conexión: ${healthError.message}`);
      }

      // Test 2: Test auth state
      setStatus("Verificando estado de autenticación...");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Test 3: Test staff views (only if authenticated)
        setStatus("Probando vistas de staff...");

        const { data: teamsData, error: teamsError } = await supabase
          .from("staff_my_teams_v")
          .select("*")
          .limit(5);

        const { data: occurrencesData, error: occurrencesError } =
          await supabase.from("staff_my_occurrences_v").select("*").limit(5);

        setViewsData({
          teams: { data: teamsData, error: teamsError },
          occurrences: { data: occurrencesData, error: occurrencesError },
        });

        setStatus(`✅ Conectado como ${user.email}`);
      } else {
        setStatus("🔓 No autenticado (esto es normal antes del login)");
      }
    } catch (err: any) {
      setError(err.message);
      setStatus("❌ Error de conexión");
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Debug - Conexión Supabase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium">Estado de Conexión:</h4>
          <p className="text-sm text-gray-600">{status}</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {viewsData && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Vista staff_my_teams_v:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(viewsData.teams, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="font-medium">Vista staff_my_occurrences_v:</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                {JSON.stringify(viewsData.occurrences, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <button
          onClick={testConnection}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reintentar Conexión
        </button>
      </CardContent>
    </Card>
  );
}
