export type Team = {
  teamid: string;
  name: string;
  description?: string | null;
  isactive: boolean;
  participants?: number;
  price?: number;
  schoolid?: number;
  created_at?: string;
  updated_at?: string;
  logo?: string | null;
};

export type Staff = {
  id: string;
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
};

export type Student = {
  studentid: string;
  firstname: string;
  lastname: string;
  dob?: string;
  grade?: string;
  ecname?: string;
  ecphone?: string;
  ecrelationship?: string;
  StudentDismisall?: string;
};

export type Enrollment = {
  enrollmentid: string;
  teamid: string;
  studentid: string;
  isactive: boolean;
};

export type Assistance = {
  id: string;
  sessionid: string;
  studentid: string;
  assisted: boolean;
  date: string; // Fecha específica de la sesión (YYYY-MM-DD)
};

export type School = {
  schoolid: number;
  name: string;
  location: string;
};

export type Parent = {
  parentid: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
};

// Combined types for UI
export type StudentWithAssistance = Student & {
  assistance?: Assistance;
  enrollment?: Enrollment;
};

export type SessionWithTeam = Session & {
  team?: Pick<Team, "name" | "description">;
};

export type TeamWithSchool = Team & {
  school?: Pick<School, "name" | "location">;
};

// Type for session occurrences (calculated from session data)
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
