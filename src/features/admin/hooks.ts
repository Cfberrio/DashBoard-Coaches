import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAllTeams,
  getAllTeamsAttendanceReport,
  getTeamAttendanceReport,
  getAttendanceStats,
} from "./api";
import {
  TeamWithSchool,
  Student,
  Session,
  Assistance,
  Team,
} from "../coach/types";

// Export messaging hooks
export * from './messaging-hooks';

/**
 * Hook to get all teams for admin dashboard using React Query
 */
export function useAllTeams() {
  return useQuery({
    queryKey: ["admin", "teams"],
    queryFn: getAllTeams,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

/**
 * Hook to get attendance report for all teams or a specific team
 */
export function useAttendanceReport(
  teamId?: string,
  startDate?: string,
  endDate?: string
) {
  const [data, setData] = useState<{
    teams: TeamWithSchool[];
    attendance: (Assistance & {
      student: Student;
      session: Session;
      team?: Team;
    })[];
  }>({ teams: [], attendance: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceReport = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (teamId) {
          // Get specific team report
          const result = await getTeamAttendanceReport(teamId, startDate, endDate);
          // Get team info for the header
          const teams = await getAllTeams();
          const team = teams.find(t => t.teamid === teamId);
          
          setData({
            teams: team ? [team] : [],
            attendance: result.attendance,
          });
        } else {
          // Get all teams report
          const result = await getAllTeamsAttendanceReport(startDate, endDate);
          setData(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading attendance report");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceReport();
  }, [teamId, startDate, endDate]);

  return { 
    ...data, 
    isLoading, 
    error, 
    refetch: () => setIsLoading(true) 
  };
}

/**
 * Hook to get attendance statistics
 */
export function useAttendanceStats(
  teamId?: string,
  startDate?: string,
  endDate?: string
) {
  const [stats, setStats] = useState<{
    totalSessions: number;
    totalStudents: number;
    averageAttendance: number;
    attendanceByDate: Array<{
      date: string;
      present: number;
      absent: number;
      total: number;
    }>;
  }>({
    totalSessions: 0,
    totalStudents: 0,
    averageAttendance: 0,
    attendanceByDate: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAttendanceStats(teamId, startDate, endDate);
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [teamId, startDate, endDate]);

  return { stats, isLoading, error, refetch: () => setIsLoading(true) };
}
