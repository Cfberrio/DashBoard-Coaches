import { supabase } from "@/lib/supabaseClient";
import {
  Staff,
  Student,
  Assistance,
  TeamWithSchool,
  Session,
  Team,
} from "../coach/types";

interface ExtendedAttendance extends Assistance {
  session?: Session & {
    team?: Team;
  };
  student?: Student;
}

interface RawTeamWithSchool {
  teamid: string;
  name: string;
  description?: string | null;
  status?: string;
  isactive: boolean;
  participants?: number;
  price?: number;
  schoolid?: number;
  school: {
    schoolid: number;
    name: string;
    location?: string;
  }[];
}

interface EnrollmentWithStudent {
  student: Student[] | null;
}

/**
 * Get all teams with school information (admin view)
 */
export async function getAllTeams(): Promise<TeamWithSchool[]> {
  const { data, error } = await supabase
    .from("team")
    .select(
      `
      teamid, 
      name, 
      description,
      status,
      isactive, 
      participants, 
      price,
      schoolid,
      school:schoolid (
        schoolid,
        name,
        location
      )
    `
    )
    .in("status", ["ongoing", "closed"])
    .order("name");

  if (error) {
    throw new Error(`Error al obtener equipos: ${error.message}`);
  }

  // Convert raw data to proper format
  const teams: TeamWithSchool[] = (data as RawTeamWithSchool[]).map(team => ({
    ...team,
    status: team.status,
    school: team.school?.[0] ? {
      name: team.school[0].name,
      location: team.school[0].location || ''
    } : undefined
  }));

  return teams;
}

/**
 * Get all sessions for all teams (admin view)
 */
export async function getAllSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from("session")
    .select("*")
    .order("startdate", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener sesiones: ${error.message}`);
  }

  return data as Session[];
}

/**
 * Get sessions filtered by team
 */
export async function getSessionsByTeam(teamId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("session")
    .select("*")
    .eq("teamid", teamId)
    .order("startdate", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener sesiones del equipo: ${error.message}`);
  }

  return data as Session[];
}

/**
 * Get all students enrolled in a specific team
 */
export async function getStudentsByTeam(teamId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from("enrollment")
    .select(`
      student:studentid (
        studentid,
        firstname,
        lastname,
        dob,
        grade,
        ecname,
        ecphone,
        ecrelationship,
        StudentDismisall
      )
    `)
    .eq("teamid", teamId)
    .eq("isactive", true);

  if (error) {
    throw new Error(`Error al obtener estudiantes del equipo: ${error.message}`);
  }

  // Extract students from the enrollment data
  const students = (data as EnrollmentWithStudent[])
    .map(enrollment => enrollment.student?.[0])
    .filter(student => student !== null && student !== undefined) as Student[];

  return students;
}

/**
 * Get attendance records for a specific session occurrence
 */
export async function getAttendanceByOccurrence(
  sessionId: string,
  occurrenceDate: string
): Promise<Assistance[]> {
  const { data, error } = await supabase
    .from("assistance")
    .select("*")
    .eq("sessionid", sessionId)
    .eq("date", occurrenceDate);

  if (error) {
    throw new Error(`Error al obtener asistencia: ${error.message}`);
  }

  return data as Assistance[];
}

/**
 * Get all attendance records for a team within a date range
 */
export async function getTeamAttendanceReport(
  teamId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  sessions: Session[];
  attendance: (Assistance & {
    student: Student;
    session: Session;
  })[];
}> {
  // Get team sessions
  const sessionsQuery = supabase
    .from("session")
    .select("*")
    .eq("teamid", teamId);

  if (startDate) {
    sessionsQuery.gte("startdate", startDate);
  }
  if (endDate) {
    sessionsQuery.lte("enddate", endDate);
  }

  const { data: sessions, error: sessionsError } = await sessionsQuery.order("startdate");

  if (sessionsError) {
    throw new Error(`Error al obtener sesiones: ${sessionsError.message}`);
  }

  if (!sessions || sessions.length === 0) {
    return { sessions: [], attendance: [] };
  }

  const sessionIds = sessions.map(s => s.sessionid);

  // Get attendance with student and session data
  const attendanceQuery = supabase
    .from("assistance")
    .select(`
      *,
      student:studentid (
        studentid,
        firstname,
        lastname,
        grade
      ),
      session:sessionid (
        sessionid,
        teamid,
        startdate,
        enddate,
        starttime,
        endtime
      )
    `)
    .in("sessionid", sessionIds);

  if (startDate) {
    attendanceQuery.gte("date", startDate);
  }
  if (endDate) {
    attendanceQuery.lte("date", endDate);
  }

  const { data: attendance, error: attendanceError } = await attendanceQuery.order("date", { ascending: false });

  if (attendanceError) {
    throw new Error(`Error al obtener registros de asistencia: ${attendanceError.message}`);
  }

  return {
    sessions: sessions as Session[],
    attendance: attendance as (Assistance & {
      student: Student;
      session: Session;
    })[], // Type assertion for the joined data
  };
}

/**
 * Get comprehensive attendance data for all teams
 */
export async function getAllTeamsAttendanceReport(
  startDate?: string,
  endDate?: string
): Promise<{
  teams: TeamWithSchool[];
  attendance: (Assistance & {
    student: Student;
    session: Session;
    team: Team;
  })[];
}> {
  // Get all teams
  const teams = await getAllTeams();

  if (teams.length === 0) {
    return { teams: [], attendance: [] };
  }

  // Get all attendance with full details
  const attendanceQuery = supabase
    .from("assistance")
    .select(`
      *,
      student:studentid (
        studentid,
        firstname,
        lastname,
        grade
      ),
      session:sessionid (
        sessionid,
        teamid,
        startdate,
        enddate,
        starttime,
        endtime,
        team:teamid (
          teamid,
          name,
          description
        )
      )
    `);

  if (startDate) {
    attendanceQuery.gte("date", startDate);
  }
  if (endDate) {
    attendanceQuery.lte("date", endDate);
  }

  const { data: attendance, error: attendanceError } = await attendanceQuery.order("date", { ascending: false });

  if (attendanceError) {
    throw new Error(`Error al obtener registros de asistencia: ${attendanceError.message}`);
  }

  return {
    teams,
    attendance: attendance as (Assistance & {
      student: Student;
      session: Session;
      team: Team;
    })[], // Type assertion for the joined data
  };
}

/**
 * Get coach information by ID
 */
export async function getCoachById(coachId: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", coachId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Coach not found
    }
    throw new Error(`Error al obtener información del coach: ${error.message}`);
  }

  return data as Staff;
}

/**
 * Get attendance statistics for admin dashboard
 */
export async function getAttendanceStats(
  teamId?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
  attendanceByDate: Array<{
    date: string;
    present: number;
    absent: number;
    total: number;
  }>;
}> {
  let attendanceQuery = supabase
    .from("assistance")
    .select(`
      *,
      session:sessionid (
        teamid
      )
    `);

  if (teamId) {
    // This requires a more complex query, but for now we'll filter in JS
    // In production, consider creating a view or using a stored procedure
  }

  if (startDate) {
    attendanceQuery = attendanceQuery.gte("date", startDate);
  }
  if (endDate) {
    attendanceQuery = attendanceQuery.lte("date", endDate);
  }

  const { data: attendance, error } = await attendanceQuery;

  if (error) {
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }

  if (!attendance || attendance.length === 0) {
    return {
      totalSessions: 0,
      totalStudents: 0,
      averageAttendance: 0,
      attendanceByDate: [],
    };
  }

  // Filter by team if specified
  const filteredAttendance = teamId 
    ? attendance.filter((a: ExtendedAttendance) => a.session?.teamid === teamId)
    : attendance;

  // Calculate statistics
  const uniqueDates = [...new Set(filteredAttendance.map((a: ExtendedAttendance) => a.date))];
  const uniqueStudents = [...new Set(filteredAttendance.map((a: ExtendedAttendance) => a.studentid))];
  
  const presentCount = filteredAttendance.filter((a: ExtendedAttendance) => a.assisted).length;
  const totalRecords = filteredAttendance.length;
  
  const attendanceByDate = uniqueDates.map(date => {
    const dayAttendance = filteredAttendance.filter((a: ExtendedAttendance) => a.date === date);
    const present = dayAttendance.filter((a: ExtendedAttendance) => a.assisted).length;
    const total = dayAttendance.length;
    
    return {
      date,
      present,
      absent: total - present,
      total,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSessions: uniqueDates.length,
    totalStudents: uniqueStudents.length,
    averageAttendance: totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
    attendanceByDate,
  };
}
