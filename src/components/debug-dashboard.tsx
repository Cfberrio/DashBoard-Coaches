"use client";

import { useDashboard, useOccurrenceAttendance } from "@/features/coach/wiring";

export function DebugDashboard() {
  const { staff, teams, occurrences, isLoading, error } = useDashboard();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Dashboard Data</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">Staff:</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(staff, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold">Teams ({teams?.length || 0}):</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(teams, null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="font-semibold">Occurrences ({occurrences?.length || 0}):</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(occurrences, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

interface DebugAttendanceProps {
  selectedTeam: string;
  selectedOccurrence: string;
  attendanceMode: boolean;
}

export function DebugAttendance({ selectedTeam, selectedOccurrence, attendanceMode }: DebugAttendanceProps) {
  const attendanceData = useOccurrenceAttendance(
    attendanceMode ? selectedOccurrence : "",
    selectedTeam
  );

  return (
    <div className="p-4 bg-blue-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Attendance Data</h3>
      
      <div className="space-y-2 text-sm">
        <p><strong>Selected Team:</strong> {selectedTeam || "None"}</p>
        <p><strong>Selected Occurrence:</strong> {selectedOccurrence || "None"}</p>
        <p><strong>Attendance Mode:</strong> {attendanceMode ? "Yes" : "No"}</p>
        <p><strong>Is Loading:</strong> {attendanceData.isLoading ? "Yes" : "No"}</p>
        <p><strong>Error:</strong> {attendanceData.error?.message || "None"}</p>
        <p><strong>Students Count:</strong> {attendanceData.students?.length || 0}</p>
      </div>

      {attendanceData.students && attendanceData.students.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Students:</h4>
          <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(attendanceData.students, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
