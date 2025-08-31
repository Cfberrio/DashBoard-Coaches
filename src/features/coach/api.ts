import { createClient } from '@/lib/supabaseClient';
import { 
  Team, 
  Staff, 
  SessionOccurrence,
  Student, 
  Attendance, 
  AttendanceHistory, 
  AttendanceStatus 
} from './types';

/**
 * Get current staff member based on authenticated user
 */
export async function getCurrentStaff(): Promise<Staff> {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  
  if (authErr || !user) {
    throw new Error('No hay usuario autenticado');
  }
  
  // Buscar staff por userid (email)
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('userid', user.id)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('No se encontró registro de staff para el usuario actual');
    }
    throw new Error(`Error al obtener datos del staff: ${error.message}`);
  }
  
  return data as Staff;
}

/**
 * Get teams assigned to current authenticated staff member
 * Using session table where coach is assigned (session.coachid)
 */
export async function getMyTeams(): Promise<Team[]> {
  const supabase = createClient();
  
  // First get current user
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error('No hay usuario autenticado');
  }

  // Get staff record to find staff ID
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id')
    .eq('userid', user.id)
    .single();

  if (staffError || !staffData) {
    throw new Error('No se encontró registro de staff');
  }

  // Get team IDs from sessions where this coach is assigned
  const { data: sessions, error: sessionError } = await supabase
    .from('session')
    .select('teamid')
    .eq('coachid', staffData.id);

  if (sessionError) {
    throw new Error(`Error al obtener sesiones del coach: ${sessionError.message}`);
  }

  if (!sessions || sessions.length === 0) {
    return []; // No teams assigned
  }

  // Get unique team IDs
  const teamIds = [...new Set(sessions.map(s => s.teamid))];

  // Get team details with school information for location
  const { data, error } = await supabase
    .from('team')
    .select(`
      teamid, 
      name, 
      description, 
      isactive, 
      participants, 
      price,
      school:schoolid (
        name,
        location
      )
    `)
    .in('teamid', teamIds)
    .eq('isactive', true)
    .order('name');
    
  if (error) {
    throw new Error(`Error al obtener equipos: ${error.message}`);
  }
  
  // Transform to match our Team type
  return (data || []).map(item => ({
    teamid: item.teamid,
    name: item.name,
    description: item.description || '',
    isactive: item.isactive,
    location: item.school?.location || 'Ubicación no disponible'
  })) as Team[];
}

/**
 * Get upcoming session occurrences for current authenticated staff
 * Using session_occurrence_series function or direct session table
 */
export async function getUpcomingOccurrencesForTeams(): Promise<SessionOccurrence[]> {
  const supabase = createClient();
  
  // First get teams for current user
  const teams = await getMyTeams();
  if (teams.length === 0) {
    return [];
  }
  
  const teamIds = teams.map(t => t.teamid);
  
  // Get sessions for these teams (no location field in session table)
  const { data: sessions, error } = await supabase
    .from('session')
    .select('sessionid, teamid, startdate, enddate, starttime, endtime, daysofweek, repeat')
    .in('teamid', teamIds)
    .order('startdate', { ascending: true });
    
  if (error) {
    throw new Error(`Error al obtener sesiones: ${error.message}`);
  }
  
  if (!sessions || sessions.length === 0) {
    return [];
  }
  
  // Generate occurrences based on session schedule
  const today = new Date();
  const occurrences: SessionOccurrence[] = [];
  
  // Mapeo de días de la semana en español a números (0 = Domingo)
  const dayMap: { [key: string]: number } = {
    'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 
    'jueves': 4, 'viernes': 5, 'sábado': 6,
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };
  
  for (const session of sessions) {
    const sessionStart = new Date(session.startdate);
    const sessionEnd = new Date(session.enddate);
    
    // Solo incluir sesiones activas
    if (sessionEnd < today) continue;
    
    const teamName = teams.find(t => t.teamid === session.teamid)?.name || 'Equipo';
    const teamWithLocation = teams.find(t => t.teamid === session.teamid);
    const location = teamWithLocation?.location || 'Ubicación no disponible';
    
    // Obtener el día de la semana de la sesión
    const sessionDayOfWeek = dayMap[session.daysofweek.toLowerCase()];
    
    if (sessionDayOfWeek === undefined) {
      console.warn(`Día de semana no reconocido: ${session.daysofweek}`);
      continue;
    }
    
    // Generar todas las ocurrencias semanales en el período
    let currentDate = new Date(sessionStart);
    
    // Buscar el primer día que coincida con el día de la semana
    while (currentDate.getDay() !== sessionDayOfWeek && currentDate <= sessionEnd) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generar ocurrencias semanales
    while (currentDate <= sessionEnd) {
      // Solo incluir ocurrencias desde hoy hacia adelante, pero también incluir la de hoy
      if (currentDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        const [hours, minutes] = session.starttime.split(':');
        const [endHours, endMinutes] = session.endtime.split(':');
        
        const startDateTime = new Date(currentDate);
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const endDateTime = new Date(currentDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
        
        occurrences.push({
          id: `${session.sessionid}_${currentDate.toISOString().split('T')[0]}`,
          sessionid: session.sessionid,
          teamid: session.teamid,
          teamname: teamName,
          starts_at: startDateTime.toISOString(),
          ends_at: endDateTime.toISOString(),
          occurrence_date: currentDate.toISOString().split('T')[0],
          location: location,
          status: 'scheduled'
        });
      }
      
      // Avanzar una semana
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  
  return occurrences.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

/**
 * Get active roster (students) for a specific team using enrollment table
 */
export async function getActiveRoster(teamId: string): Promise<Student[]> {
  const supabase = createClient();
  
  // Get active enrollments with student data
  const { data, error } = await supabase
    .from('enrollment')
    .select(`
      studentid,
      student:studentid (
        studentid,
        firstname,
        lastname
      )
    `)
    .eq('teamid', teamId)
    .eq('isactive', true);
    
  if (error) {
    throw new Error(`Error al obtener roster: ${error.message}`);
  }
  
  // Transform to Student format and sort by lastname
  const students = (data || []).map(item => ({
    studentid: item.studentid,
    firstname: item.student.firstname,
    lastname: item.student.lastname
  })) as Student[];
  
  // Sort by lastname in JavaScript
  return students.sort((a, b) => a.lastname.localeCompare(b.lastname));
}

/**
 * Seed attendance for an occurrence (not needed with RPC, kept for compatibility)
 */
export async function seedAttendance(occurrenceId: string): Promise<void> {
  // No longer needed since RPC handles attendance creation
  // This function exists for hook compatibility
  return Promise.resolve();
}

/**
 * Get attendance records for a specific occurrence
 */
export async function getAttendanceForOccurrence(occurrenceId: string): Promise<Attendance[]> {
  const supabase = createClient();
  
  // Parse composite ID to get sessionid and occurrence_date
  const [sessionId, occurrenceDate] = occurrenceId.split('_');
  
  const { data, error } = await supabase
    .from('attendance')
    .select('attendanceid, sessionid, occurrence_date, studentid, status, checked_in_at, checked_in_by, note')
    .eq('sessionid', sessionId)
    .eq('occurrence_date', occurrenceDate)
    .order('checked_in_at', { ascending: true });
    
  if (error) {
    throw new Error(`Error al obtener asistencia: ${error.message}`);
  }
  
  // Transform to match our Attendance type (map attendanceid to id)
  return (data || []).map(item => ({
    id: item.attendanceid,
    occurrenceid: `${item.sessionid}_${item.occurrence_date}`,
    studentid: item.studentid,
    status: item.status,
    checked_in_at: item.checked_in_at,
    checked_in_by: item.checked_in_by,
    note: item.note
  })) as Attendance[];
}

/**
 * Set attendance status using RPC set_attendance_status
 */
export async function setAttendance(
  occurrenceId: string,
  studentId: string,
  status: AttendanceStatus,
  note?: string
): Promise<void> {
  const supabase = createClient();
  
  // Parse composite ID to get sessionid and occurrence_date
  const [sessionId, occurrenceDate] = occurrenceId.split('_');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  
  const { data, error } = await supabase
    .rpc('set_attendance_status', {
      p_session_id: sessionId,
      p_occurrence_date: occurrenceDate,
      p_student_id: studentId,
      p_status: status,
      p_changed_by: user.id,
      p_note: note || null
    });
  
  if (error) {
    throw new Error(`Error al actualizar asistencia: ${error.message}`);
  }
}

/**
 * Get attendance change history for a specific attendance record
 */
export async function getAttendanceHistory(attendanceId: string): Promise<AttendanceHistory[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('attendance_history')
    .select('*')
    .eq('attendanceid', attendanceId)
    .order('changed_at', { ascending: true });
    
  if (error) {
    throw new Error(`Error al obtener historial: ${error.message}`);
  }
  
  return data as AttendanceHistory[];
}

/**
 * Get team details by ID
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('teamid', teamId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Error al obtener equipo: ${error.message}`);
  }
  
  return data as Team;
}

/**
 * Get student details by ID
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('student')
    .select('studentid, firstname, lastname')
    .eq('studentid', studentId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Error al obtener estudiante: ${error.message}`);
  }
  
  return data as Student;
}
