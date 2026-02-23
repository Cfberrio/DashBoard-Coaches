/**
 * TeamSelector Component
 * Dropdown to select a team for messaging
 */

import { CoachTeam } from "@/features/coach/messaging-types";

interface TeamSelectorProps {
  teams: CoachTeam[];
  selected: string | null;
  onChange: (teamId: string) => void;
}

export function TeamSelector({ teams, selected, onChange }: TeamSelectorProps) {
  if (teams.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">
          No teams available. You need assigned sessions to access messages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="team-select" className="block text-sm font-medium text-gray-700">
        Select Team
      </label>
      <select
        id="team-select"
        value={selected || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="" disabled>
          -- Select a team --
        </option>
        {teams.map((team) => (
          <option key={team.teamid} value={team.teamid}>
            {team.name} {team.status && `(${team.status === "ongoing" ? "Starting" : team.status === "closed" ? "Ending" : team.status})`}
          </option>
        ))}
      </select>
    </div>
  );
}
