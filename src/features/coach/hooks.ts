import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentStaff,
  getMyTeams,
  getUpcomingOccurrencesForTeams,
  getActiveRoster,
  getAssistanceForOccurrence,
  setAssistance,
  getTeamById,
  getStudentById,
} from "./api";

// Query keys for React Query
export const QUERY_KEYS = {
  currentStaff: ["currentStaff"] as const,
  myTeams: (staffId: string) => ["myTeams", staffId] as const,
  upcomingOccurrences: (teamIds: string[]) =>
    ["upcomingOccurrences", teamIds] as const,
  roster: (teamId: string) => ["roster", teamId] as const,
  assistance: (occurrenceId: string) => ["assistance", occurrenceId] as const,
  team: (teamId: string) => ["team", teamId] as const,
  student: (studentId: string) => ["student", studentId] as const,
};

/**
 * Hook to get current authenticated staff member
 */
export function useCurrentStaff() {
  return useQuery({
    queryKey: QUERY_KEYS.currentStaff,
    queryFn: getCurrentStaff,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to get teams for current authenticated staff member
 */
export function useMyTeams() {
  return useQuery({
    queryKey: QUERY_KEYS.myTeams("current"),
    queryFn: getMyTeams,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get upcoming occurrences for current authenticated staff
 */
export function useUpcomingOccurrences() {
  return useQuery({
    queryKey: QUERY_KEYS.upcomingOccurrences(["current"]),
    queryFn: getUpcomingOccurrencesForTeams,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

/**
 * Hook to get active roster for a team
 */
export function useRoster(teamId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.roster(teamId || ""),
    queryFn: () => getActiveRoster(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get assistance for an occurrence
 */
export function useAssistance(occurrenceId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.assistance(occurrenceId || ""),
    queryFn: () => getAssistanceForOccurrence(occurrenceId!),
    enabled: !!occurrenceId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Hook to get team details
 */
export function useTeam(teamId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.team(teamId || ""),
    queryFn: () => getTeamById(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get student details
 */
export function useStudent(studentId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.student(studentId || ""),
    queryFn: () => getStudentById(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation hook to set assistance status
 */
export function useSetAssistance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      occurrenceId,
      studentId,
      assisted,
    }: {
      occurrenceId: string;
      studentId: string;
      assisted: boolean;
    }) => setAssistance(occurrenceId, studentId, assisted),
    onSuccess: (_, { occurrenceId }) => {
      // Invalidate assistance query to refresh the list
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.assistance(occurrenceId),
      });
    },
  });
}

/**
 * Combined hook for dashboard data
 */
export function useDashboardData() {
  const currentStaffQuery = useCurrentStaff();
  const myTeamsQuery = useMyTeams();
  const upcomingOccurrencesQuery = useUpcomingOccurrences();

  return {
    staff: currentStaffQuery,
    teams: myTeamsQuery,
    occurrences: upcomingOccurrencesQuery,
    isLoading:
      currentStaffQuery.isLoading ||
      myTeamsQuery.isLoading ||
      upcomingOccurrencesQuery.isLoading,
    error:
      currentStaffQuery.error ||
      myTeamsQuery.error ||
      upcomingOccurrencesQuery.error,
  };
}
