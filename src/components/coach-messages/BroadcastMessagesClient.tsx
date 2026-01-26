/**
 * BroadcastMessagesClient Component
 * Main client component for broadcast messaging functionality
 */

"use client";

import { useState } from "react";
import { useCoachTeams, useCurrentCoachId, useTeamBroadcasts } from "@/features/coach/messaging-hooks";
import { TeamSelector } from "./TeamSelector";
import { BroadcastPanel } from "./BroadcastPanel";
import { BroadcastHistory } from "./BroadcastHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, AlertTriangle } from "lucide-react";

export function BroadcastMessagesClient() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: coachId, isLoading: coachLoading } = useCurrentCoachId();
  const { data: teams = [], isLoading: teamsLoading } = useCoachTeams();
  const { 
    data: broadcasts = [], 
    isLoading: broadcastsLoading,
    error: broadcastsError 
  } = useTeamBroadcasts(
    selectedTeamId,
    coachId || null
  );

  if (coachLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!coachId) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Por favor inicia sesión para acceder a los mensajes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Migration Warning - Show if broadcasts error indicates missing column */}
      {broadcastsError && (
        <Alert className="mb-6 border-amber-500 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Migración SQL Requerida</AlertTitle>
          <AlertDescription className="text-amber-800">
            La funcionalidad de broadcast requiere ejecutar una migración en la base de datos.
            Por favor consulta el archivo <code className="bg-amber-100 px-1 rounded">INSTRUCCIONES-BROADCAST.md</code> para más detalles.
          </AlertDescription>
        </Alert>
      )}

      {/* Team Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Seleccionar Team</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamSelector
            teams={teams}
            selected={selectedTeamId}
            onChange={setSelectedTeamId}
          />
        </CardContent>
      </Card>

      {/* Broadcast Panel - Send new broadcast */}
      {selectedTeamId && coachId && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Mensaje a Todo el Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BroadcastPanel teamId={selectedTeamId} coachId={coachId} />
            </CardContent>
          </Card>

          {/* Broadcast History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de Mensajes Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              <BroadcastHistory
                broadcasts={broadcasts}
                isLoading={broadcastsLoading}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Help text when no team selected */}
      {!selectedTeamId && teams.length > 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Selecciona un team para enviar mensajes</p>
        </div>
      )}
    </div>
  );
}
