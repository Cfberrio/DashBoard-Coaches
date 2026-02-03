/**
 * AdminMessagesTab Component
 * Clean table-based view of all coach-parent conversations
 * Organized by team with expandable rows to view full message history
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Loader2, ChevronDown } from "lucide-react";
import { useAllTeams } from "@/features/admin/hooks";
import { useAdminConversations } from "@/features/admin/messaging-hooks";
import { ConversationRow } from "./ConversationRow";

export function AdminMessagesTab() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Get all teams
  const { data: teams = [], isLoading: teamsLoading, error: teamsError } = useAllTeams();

  // Get conversations for selected team
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
    realtimeConnected: conversationsRealtime,
  } = useAdminConversations(selectedTeamId);

  // Auto-select first team when teams load
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].teamid);
    }
  }, [teams, selectedTeamId]);

  // Reset expanded row when team changes
  useEffect(() => {
    setExpandedRowId(null);
  }, [selectedTeamId]);

  // Handle row toggle
  const handleRowToggle = (rowId: string) => {
    setExpandedRowId(expandedRowId === rowId ? null : rowId);
  };

  // Get current team name
  const currentTeam = teams.find((t) => t.teamid === selectedTeamId);

  return (
    <div className="space-y-4">
      {/* Header Card with Team Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Team Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Team
              </label>
              {teamsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading teams...
                </div>
              ) : teamsError ? (
                <div className="text-sm text-red-600 p-3 bg-red-50 rounded">
                  Error loading teams: {teamsError.message || "Unknown error"}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                  No teams available
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedTeamId || ""}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    {teams.map((team) => (
                      <option key={team.teamid} value={team.teamid}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Stats */}
            {selectedTeamId && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {conversations.length} Conversations
                </Badge>
                {conversationsRealtime && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </div>
            )}

            {conversationsError && (
              <div className="text-xs text-red-600 p-2 bg-red-50 rounded">
                Error loading conversations: {conversationsError.message || "Unknown error"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      {selectedTeamId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Conversations for {currentTeam?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      {/* Expand icon column */}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coach
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parent
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Messages
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-xs">
                      Last Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conversationsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Loading conversations...
                      </td>
                    </tr>
                  ) : conversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No conversations found for this team
                      </td>
                    </tr>
                  ) : (
                    conversations.map((conversation) => {
                      const rowId = `${conversation.coachid}-${conversation.parentid}`;
                      return (
                        <ConversationRow
                          key={rowId}
                          conversation={conversation}
                          teamId={selectedTeamId}
                          isExpanded={expandedRowId === rowId}
                          onToggle={() => handleRowToggle(rowId)}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
