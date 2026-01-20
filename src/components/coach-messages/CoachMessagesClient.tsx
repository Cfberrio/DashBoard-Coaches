/**
 * CoachMessagesClient Component
 * Main client component for coach messaging system
 */

"use client";

import { useState, useEffect } from "react";
import { useCoachTeams, useCurrentCoachId, useParentsByTeam } from "@/features/coach/messaging-hooks";
import { TeamSelector } from "./TeamSelector";
import { ParentSelector } from "./ParentSelector";
import { ChatPanel } from "./ChatPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCoachNotifications } from "@/hooks/useCoachNotifications";

export function CoachMessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Get current coach ID
  const {
    data: coachId,
    isLoading: coachLoading,
    error: coachError,
  } = useCurrentCoachId();

  // Get teams for this coach
  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
  } = useCoachTeams();

  // Get parents for selected team
  const {
    data: parents = [],
    isLoading: parentsLoading,
    error: parentsError,
  } = useParentsByTeam(selectedTeamId);

  // Get notifications hook for marking messages as read
  const { markAsRead } = useCoachNotifications(coachId || null);

  // Check for URL params (from notification click)
  useEffect(() => {
    const teamParam = searchParams.get("team");
    const parentParam = searchParams.get("parent");
    
    if (teamParam && teams.some((t) => t.teamid === teamParam)) {
      setSelectedTeamId(teamParam);
    }
    
    if (parentParam) {
      setSelectedParentId(parentParam);
    }
  }, [searchParams, teams]);

  // Auto-select first team when teams load (only if no URL params)
  useEffect(() => {
    const teamParam = searchParams.get("team");
    if (teams.length > 0 && !selectedTeamId && !teamParam) {
      setSelectedTeamId(teams[0].teamid);
    }
  }, [teams, selectedTeamId, searchParams]);

  // Reset parent selection when team changes (but not on initial load from URL)
  useEffect(() => {
    const parentParam = searchParams.get("parent");
    if (!parentParam) {
      setSelectedParentId(null);
    }
  }, [selectedTeamId, searchParams]);

  // Mark conversation as read when both team and parent are selected
  useEffect(() => {
    if (selectedTeamId && selectedParentId && coachId) {
      console.log(`📖 Marking conversation as read: team=${selectedTeamId}, parent=${selectedParentId}`);
      markAsRead(selectedTeamId, selectedParentId);
    }
  }, [selectedTeamId, selectedParentId, coachId, markAsRead]);

  // Loading state
  if (coachLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (coachError || teamsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-sm mb-4">
            {coachError?.message || teamsError?.message || "Failed to load messaging system"}
          </p>
          <Button onClick={() => router.push("/")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!coachId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-600 mb-4">
            Please log in to access messages.
          </p>
          <Button onClick={() => router.push("/")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Step 1: Team Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Select Team</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamSelector
              teams={teams}
              selected={selectedTeamId}
              onChange={setSelectedTeamId}
            />
          </CardContent>
        </Card>

        {/* Step 2: Parent Selection - Only show if team is selected */}
        {selectedTeamId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Step 2: Select Parent from {teams.find((t) => t.teamid === selectedTeamId)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parentsError ? (
                <div className="text-center text-red-600 py-4">
                  <p className="text-sm">Error loading parents: {parentsError.message}</p>
                </div>
              ) : (
                <ParentSelector
                  parents={parents}
                  selected={selectedParentId}
                  onChange={setSelectedParentId}
                  isLoading={parentsLoading}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Chat Panel - Only show if both team and parent are selected */}
        {selectedTeamId && selectedParentId && coachId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Chat: {teams.find((t) => t.teamid === selectedTeamId)?.name} - {" "}
                {parents.find((p) => p.parentid === selectedParentId)?.firstname}{" "}
                {parents.find((p) => p.parentid === selectedParentId)?.lastname}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChatPanel 
                teamId={selectedTeamId} 
                parentId={selectedParentId}
                parentName={`${parents.find((p) => p.parentid === selectedParentId)?.firstname} ${parents.find((p) => p.parentid === selectedParentId)?.lastname}`}
                coachId={coachId} 
              />
            </CardContent>
          </Card>
        )}

        {/* Help text when no selections made */}
        {!selectedTeamId && teams.length > 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Select a team to start messaging</p>
          </div>
        )}

        {selectedTeamId && !selectedParentId && parents.length > 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Select a parent to start the conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
