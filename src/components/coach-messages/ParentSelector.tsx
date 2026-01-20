/**
 * ParentSelector Component
 * Dropdown to select a parent for individual messaging
 * Shows parent name with their children and team information
 */

import { ParentWithStudents } from "@/features/coach/messaging-types";

interface ParentSelectorProps {
  parents: ParentWithStudents[];
  selected: string | null;
  onChange: (parentId: string) => void;
  isLoading?: boolean;
}

export function ParentSelector({ 
  parents, 
  selected, 
  onChange,
  isLoading = false,
}: ParentSelectorProps) {
  if (isLoading) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">Loading parents...</p>
      </div>
    );
  }

  if (parents.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p className="text-sm">
          No parents found for this team. Make sure students are enrolled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="parent-select" className="block text-sm font-medium text-gray-700">
        Select Parent to Message
      </label>
      <select
        id="parent-select"
        value={selected || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="" disabled>
          -- Select a parent --
        </option>
        {parents.map((parent) => (
          <option key={parent.parentid} value={parent.parentid}>
            📧 {parent.firstname} {parent.lastname} (Team: {parent.teamname}) - 
            👤 {parent.students.map(s => `${s.firstname} ${s.lastname}`).join(", ")}
          </option>
        ))}
      </select>
      
      {selected && (
        <div className="text-xs text-gray-600 mt-2">
          <p>
            <strong>Selected:</strong>{" "}
            {parents.find((p) => p.parentid === selected)?.firstname}{" "}
            {parents.find((p) => p.parentid === selected)?.lastname}
          </p>
          <p>
            <strong>Students:</strong>{" "}
            {parents
              .find((p) => p.parentid === selected)
              ?.students.map((s) => `${s.firstname} ${s.lastname}`)
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
