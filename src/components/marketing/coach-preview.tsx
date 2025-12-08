"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoachPreviewProps {
  selectedTeamIds: string[];
}

interface Coach {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  teams: Array<{
    teamid: string;
    name: string;
    sport: string | null;
    school: {
      name: string;
      location: string;
    } | null;
  }>;
}

export function CoachPreview({ selectedTeamIds }: CoachPreviewProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCoaches() {
      if (selectedTeamIds.length === 0) {
        setCoaches([]);
        return;
      }

      try {
        setLoading(true);

        // Get sessions from selected teams
        const { data: sessions, error: sessionsError } = await supabase
          .from("session")
          .select(`
            coachid,
            teamid,
            team:teamid (
              teamid,
              name,
              sport,
              school:schoolid (
                name,
                location
              )
            ),
            staff:coachid (
              id,
              name,
              email,
              phone
            )
          `)
          .in("teamid", selectedTeamIds);

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          return;
        }

        if (!sessions || sessions.length === 0) {
          setCoaches([]);
          return;
        }

        // Group by coach (remove duplicates)
        const coachMap = new Map<string, Coach>();

        sessions.forEach((session: Record<string, unknown>) => {
          // Handle relations that can come as object or array
          const coach = Array.isArray(session.staff)
            ? session.staff[0]
            : session.staff;
          const team = Array.isArray(session.team)
            ? session.team[0]
            : session.team;

          if (!coach || !team) {
            return;
          }

          if (!coachMap.has(coach.id)) {
            coachMap.set(coach.id, {
              id: coach.id,
              name: coach.name || "",
              email: coach.email || "",
              phone: coach.phone || null,
              teams: [],
            });
          }

          const coachData = coachMap.get(coach.id)!;

          // Avoid duplicate teams for the same coach
          const teamExists = coachData.teams.some(
            (t) => t.teamid === team.teamid
          );
          if (!teamExists) {
            // Handle school that can come as object or array
            const schoolData = Array.isArray(team.school) && team.school.length > 0
              ? team.school[0]
              : team.school;

            coachData.teams.push({
              teamid: team.teamid,
              name: team.name || "",
              sport: team.sport || null,
              school: schoolData
                ? {
                    name: schoolData.name || "",
                    location: schoolData.location || "",
                  }
                : null,
            });
          }
        });

        setCoaches(Array.from(coachMap.values()));
      } catch (error) {
        console.error("Error loading coaches:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCoaches();
  }, [selectedTeamIds]);

  if (selectedTeamIds.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Select teams to see coaches who will receive the email.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Loading coaches...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Recipients ({coaches.length}{" "}
          {coaches.length === 1 ? "coach" : "coaches"})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {coaches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No coaches found for the selected teams.
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="p-4 rounded-md border bg-card"
              >
                <div className="font-semibold text-base mb-2">{coach.name}</div>
                <div className="ml-4 space-y-1">
                  {coach.teams.map((team) => (
                    <div key={team.teamid} className="text-sm text-muted-foreground">
                      • {team.name}
                      {team.school && (
                        <span className="text-xs ml-2">
                          ({team.school.name})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  <div>{coach.email}</div>
                  {coach.phone && <div>{coach.phone}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
