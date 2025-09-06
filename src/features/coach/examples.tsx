"use client";

import React from 'react';
import { CoachDashboard } from '@/components/coach-dashboard';
import { useDashboard, useOccurrenceAttendance, AttendanceStatusBadge } from './wiring';
import { AttendanceStatus } from './types';

/**
 * Example: Main dashboard component connected to data
 */
export function ConnectedCoachDashboard() {
  const { staff, teams, occurrences, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-lg font-semibold mb-2">Error loading dashboard</h2>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  // Pass data to the existing CoachDashboard component
  return (
    <CoachDashboard 
      staff={staff}
      teams={teams}
      occurrences={occurrences}
    />
  );
}

/**
 * Example: Attendance management component for a specific occurrence
 */
export function AttendanceManager({ occurrenceId, teamId }: { occurrenceId: string; teamId?: string }) {
  const { students, isLoading, error, setAttendance, isSettingAttendance } = useOccurrenceAttendance(occurrenceId, teamId);

  if (isLoading) {
    return <div className="p-4">Loading attendance...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading attendance: {error.message}
      </div>
    );
  }

  const handleStatusChange = (studentId: string, status: AttendanceStatus, note?: string) => {
    setAttendance(studentId, status, note);
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Student Attendance</h3>
      
      <div className="space-y-2">
        {students.map(student => (
          <div key={student.studentid} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <span className="font-medium">
                {student.firstname} {student.lastname}
              </span>
              {student.attendance?.note && (
                <p className="text-sm text-gray-600 mt-1">{student.attendance.note}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {student.attendance ? (
                <AttendanceStatusBadge status={student.attendance.status} />
              ) : (
                <span className="text-gray-400">—</span>
              )}
              
              <div className="flex gap-1">
                {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(student.studentid, status)}
                    disabled={isSettingAttendance}
                    className={`px-2 py-1 rounded text-xs ${
                      student.attendance?.status === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {isSettingAttendance && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Updating attendance...
        </div>
      )}
    </div>
  );
}

/**
 * Example: How to use the dashboard data in any component
 */
export function DashboardStats() {
  const { teams, occurrences } = useDashboard();

  const totalOccurrences = occurrences.length;
  const upcomingToday = occurrences.filter(occ => {
    const today = new Date().toDateString();
    const occDate = new Date(occ.starts_at).toDateString();
    return today === occDate;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800">My Teams</h3>
        <p className="text-2xl font-bold text-blue-600">{teams.length}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h3>
        <p className="text-2xl font-bold text-green-600">{totalOccurrences}</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800">Today's Sessions</h3>
        <p className="text-2xl font-bold text-orange-600">{upcomingToday}</p>
      </div>
    </div>
  );
}

/**
 * Example: Loading state wrapper
 */
export function LoadingWrapper({ children }: { children: React.ReactNode }) {
  const { isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading coach dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Unable to load dashboard</h2>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
