"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useDashboardData,
  useRoster,
  useAssistance,
  useSetAssistance,
  useTeam,
  useUpcomingOccurrences,
} from "./hooks";
import { SessionOccurrence, StudentWithAssistance } from "./types";

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
 * Hook for occurrence assistance management
 */
export function useOccurrenceAttendance(occurrenceId: string, teamId?: string) {
  // Get roster and assistance
  const rosterQuery = useRoster(teamId);
  const assistanceQuery = useAssistance(occurrenceId);

  // Mutations
  const setAssistanceMutation = useSetAssistance();

  // Merge roster with assistance data
  const studentsWithAssistance: StudentWithAssistance[] = React.useMemo(() => {
    const roster = rosterQuery.data || [];
    const assistance = assistanceQuery.data || [];

    return roster.map((student) => ({
      ...student,
      assistance: assistance.find((att) => att.studentid === student.studentid),
    }));
  }, [rosterQuery.data, assistanceQuery.data]);

  const setStudentAttendance = (studentId: string, assisted: boolean) => {
    setAssistanceMutation.mutate({
      occurrenceId,
      studentId,
      assisted,
    });
  };

  return {
    students: studentsWithAssistance,
    isLoading: rosterQuery.isLoading || assistanceQuery.isLoading,
    error:
      rosterQuery.error || assistanceQuery.error || setAssistanceMutation.error,
    setAttendance: setStudentAttendance,
    isSettingAttendance: setAssistanceMutation.isPending,
  };
}

/**
 * Component wrapper that provides occurrence-specific data
 */
export function OccurrenceProvider({
  occurrenceId,
  teamId,
  children,
}: {
  occurrenceId: string;
  teamId?: string;
  children: (
    props: ReturnType<typeof useOccurrenceAttendance>
  ) => React.ReactNode;
}) {
  const attendanceData = useOccurrenceAttendance(occurrenceId, teamId);

  return <>{children(attendanceData)}</>;
}

/**
 * Helper component for rendering assistance status with proper styling
 */
export function AttendanceStatusBadge({ assisted }: { assisted: boolean }) {
  const getStatusColor = (assisted: boolean) => {
    return assisted ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getStatusText = (assisted: boolean) => {
    return assisted ? "Presente" : "Ausente";
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
        assisted
      )}`}
    >
      {getStatusText(assisted)}
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
          <h2 className="text-lg font-semibold mb-2">
            Error loading dashboard
          </h2>
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
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return `${start.toLocaleTimeString(
    "en-US",
    options
  )} - ${end.toLocaleTimeString("en-US", options)}`;
}

export function formatOccurrenceDate(startsAt: string): string {
  const date = new Date(startsAt);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return date.toLocaleDateString("en-US", options);
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
          <h2 className="text-lg font-semibold mb-2">
            Authentication Required
          </h2>
          <p className="text-sm text-gray-600">
            Please sign in to access the coach dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
