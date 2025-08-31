"use client";

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useDashboardData, 
  useRoster, 
  useAttendance, 
  useSeedAttendance, 
  useSetAttendance,
  useTeam,
  useUpcomingOccurrences
} from './hooks';
import { SessionOccurrence, AttendanceStatus, StudentWithAttendance } from './types';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Provider component that wraps the app with React Query
 */
export function CoachDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Hook that provides dashboard data for the main dashboard component
 */
export function useDashboard() {
  const { staff, teams, occurrences, isLoading, error } = useDashboardData();

  return {
    staff: staff.data,
    teams: teams.data || [],
    occurrences: occurrences.data || [],
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook for occurrence attendance management
 */
export function useOccurrenceAttendance(occurrenceId: string, teamId?: string) {
  const [isSeeded, setIsSeeded] = useState(false);
  
  // Get roster and attendance
  const rosterQuery = useRoster(teamId);
  const attendanceQuery = useAttendance(occurrenceId);
  
  // Mutations
  const seedMutation = useSeedAttendance();
  const setAttendanceMutation = useSetAttendance();

  // Seed attendance on first load
  useEffect(() => {
    if (occurrenceId && !isSeeded && !seedMutation.isPending) {
      seedMutation.mutate(occurrenceId, {
        onSuccess: () => setIsSeeded(true),
        onError: (error) => {
          console.error('Failed to seed attendance:', error);
          setIsSeeded(true); // Mark as seeded even on error to prevent infinite retries
        }
      });
    }
  }, [occurrenceId, isSeeded, seedMutation]);

  // Merge roster with attendance data
  const studentsWithAttendance: StudentWithAttendance[] = React.useMemo(() => {
    const roster = rosterQuery.data || [];
    const attendance = attendanceQuery.data || [];
    
    return roster.map(student => ({
      ...student,
      attendance: attendance.find(att => att.studentid === student.studentid)
    }));
  }, [rosterQuery.data, attendanceQuery.data]);

  const setStudentAttendance = (
    studentId: string, 
    status: AttendanceStatus, 
    note?: string
  ) => {
    setAttendanceMutation.mutate({
      occurrenceId,
      studentId,
      status,
      note
    });
  };

  return {
    students: studentsWithAttendance,
    isLoading: rosterQuery.isLoading || attendanceQuery.isLoading || seedMutation.isPending,
    error: rosterQuery.error || attendanceQuery.error || seedMutation.error || setAttendanceMutation.error,
    setAttendance: setStudentAttendance,
    isSettingAttendance: setAttendanceMutation.isPending,
  };
}

/**
 * Component wrapper that provides occurrence-specific data
 */
export function OccurrenceProvider({ 
  occurrenceId, 
  teamId,
  children 
}: { 
  occurrenceId: string;
  teamId?: string;
  children: (props: ReturnType<typeof useOccurrenceAttendance>) => React.ReactNode;
}) {
  const attendanceData = useOccurrenceAttendance(occurrenceId, teamId);
  
  return <>{children(attendanceData)}</>;
}

/**
 * Helper component for rendering attendance status with proper styling
 */
export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'Presente';
      case 'late': return 'Tarde';
      case 'excused': return 'Justificado';
      case 'absent': return 'Ausente';
      default: return '—';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  );
}

/**
 * Example of how to wire the dashboard component
 */
export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const dashboardData = useDashboard();

  if (dashboardData.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-lg font-semibold mb-2">Error loading dashboard</h2>
          <p className="text-sm">{dashboardData.error.message}</p>
        </div>
      </div>
    );
  }

  // Pass data to children via React.cloneElement or context
  return <>{children}</>;
}

/**
 * Utility functions for formatting dates and times
 */
export function formatOccurrenceTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`;
}

export function formatOccurrenceDate(startsAt: string): string {
  const date = new Date(startsAt);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Authentication wrapper that ensures user is logged in
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { staff, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-600">Please sign in to access the coach dashboard.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
