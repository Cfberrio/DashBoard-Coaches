export type Team = {
  teamid: string;
  name: string;
  description?: string | null;
  isactive: boolean;
  location?: string; // Location from school table
};

export type Staff = {
  id: string;
  userid: string | null;
  name: string;
  email: string;
  phone?: string | null;
};

export type Session = {
  sessionid: string;
  teamid: string;
  coachid: string;
  startdate: string;
  enddate: string;
  starttime: string;
  endtime: string;
  daysofweek: string;
  repeat: string;
  location?: string | null;
};

export type Student = {
  studentid: string;
  firstname: string;
  lastname: string;
};

export type Enrollment = {
  enrollmentid: string;
  teamid: string;
  studentid: string;
  isactive: boolean;
};

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export type Attendance = {
  id: string;
  occurrenceid: string;
  studentid: string;
  status: AttendanceStatus;
  checked_in_at: string;
  checked_in_by: string | null;
  note?: string | null;
};

export type AttendanceHistory = {
  id: string;
  attendanceid: string;
  old_status: AttendanceStatus | null;
  new_status: AttendanceStatus | null;
  changed_by: string | null;
  changed_at: string;
  note?: string | null;
};

// Combined types for UI
export type StudentWithAttendance = Student & {
  attendance?: Attendance;
};

export type SessionWithTeam = Session & {
  team?: Pick<Team, 'name'>;
};

// Helper type for calculating session instances
export type SessionInstance = {
  sessionid: string;
  date: string; // YYYY-MM-DD
  startDateTime: Date;
  endDateTime: Date;
  teamid: string;
  coachid: string;
  location?: string | null;
};

// Type for session occurrences from staff_my_occurrences_v view
export type SessionOccurrence = {
  id: string; // Composite ID: sessionid_occurrence_date
  sessionid: string;
  teamid: string;
  teamname: string;
  starts_at: string; // ISO timestamp
  ends_at: string; // ISO timestamp
  occurrence_date: string; // YYYY-MM-DD
  location?: string | null;
  status: string; // 'scheduled', 'completed', etc.
};
