"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllTeams } from "@/features/admin/api";
import { TeamWithSchool } from "@/features/coach/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

interface TeamMultiSelectorProps {
  selectedTeamIds: string[];
  onSelectionChange: (teamIds: string[]) => void;
}

interface TeamWithCoachCount extends TeamWithSchool {
  coachCount: number;
}

export function TeamMultiSelector({
  selectedTeamIds,
  onSelectionChange,
}: TeamMultiSelectorProps) {
  const [teams, setTeams] = useState<TeamWithCoachCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolFilter, setSchoolFilter] = useState("");

  useEffect(() => {
    async function loadTeams() {
      try {
        setLoading(true);
        const allTeams = await getAllTeams();

        // Get coach count per team
        const teamsWithCoachCount = await Promise.all(
          allTeams.map(async (team) => {
            const { data: sessions, error } = await supabase
              .from("session")
              .select("coachid")
              .eq("teamid", team.teamid);

            if (error) {
              console.error(
                `Error getting coaches for team ${team.name}:`,
                error
              );
              return { ...team, coachCount: 0 };
            }

            // Count unique coaches
            const uniqueCoaches = new Set(
              sessions?.map((s) => s.coachid) || []
            );
            return { ...team, coachCount: uniqueCoaches.size };
          })
        );

        setTeams(teamsWithCoachCount);
      } catch (error) {
        console.error("Error loading teams:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    if (!schoolFilter.trim()) {
      return teams;
    }

    const filterLower = schoolFilter.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(filterLower) ||
        team.school?.name.toLowerCase().includes(filterLower) ||
        team.school?.location.toLowerCase().includes(filterLower)
    );
  }, [teams, schoolFilter]);

  const handleToggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      onSelectionChange(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      onSelectionChange([...selectedTeamIds, teamId]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredTeams.map((team) => team.teamid));
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading teams...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Teams</CardTitle>
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder="Filter by team or school name..."
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredTeams.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedTeamIds.length === 0}
          >
            Deselect All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active teams found.
            </p>
          ) : (
            filteredTeams.map((team) => (
              <label
                key={team.teamid}
                className="flex items-start gap-3 p-3 rounded-md border hover:bg-accent cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.teamid)}
                  onChange={() => handleToggleTeam(team.teamid)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{team.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {team.school?.name && (
                      <span>{team.school.name}</span>
                    )}
                    {team.school?.location && (
                      <span>
                        {team.school?.name ? " • " : ""}
                        {team.school.location}
                      </span>
                    )}
                    {team.coachCount > 0 && (
                      <span>
                        {" • "}
                        {team.coachCount}{" "}
                        {team.coachCount === 1 ? "coach" : "coaches"}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        {selectedTeamIds.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium">
              {selectedTeamIds.length}{" "}
              {selectedTeamIds.length === 1 ? "team selected" : "teams selected"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
