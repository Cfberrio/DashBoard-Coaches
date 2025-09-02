import { createClient } from "@/lib/supabaseClient";
import {
  Team,
  Staff,
  SessionOccurrence,
  Student,
  Assistance,
  TeamWithSchool,
} from "./types";

/**
 * Get current staff member based on authenticated user
 */
export async function getCurrentStaff(): Promise<Staff> {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("No hay usuario autenticado");
  }

  // Buscar staff por userid (email)
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("userid", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(
        "No se encontró registro de staff para el usuario actual"
      );
    }
    throw new Error(`Error al obtener datos del staff: ${error.message}`);
  }

  return data as Staff;
}

/**
 * Get teams assigned to current authenticated staff member
 * Using session table where coach is assigned (session.coachid)
 */
export async function getMyTeams(): Promise<TeamWithSchool[]> {
  const supabase = createClient();

  // First get current user
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    throw new Error("No hay usuario autenticado");
  }

  // Get staff record to find staff ID
  const { data: staffData, error: staffError } = await supabase
    .from("staff")
    .select("id")
    .eq("userid", user.id)
    .single();

  if (staffError || !staffData) {
    throw new Error("No se encontró registro de staff");
  }

  // Get team IDs from sessions where this coach is assigned
  const { data: sessions, error: sessionError } = await supabase
    .from("session")
    .select("teamid")
    .eq("coachid", staffData.id);

  if (sessionError) {
    throw new Error(
      `Error al obtener sesiones del coach: ${sessionError.message}`
    );
  }

  if (!sessions || sessions.length === 0) {
    return []; // No teams assigned
  }

  // Get unique team IDs
  const teamIds = [...new Set(sessions.map((s) => s.teamid))];

  // Get team details with school information for location
  const { data, error } = await supabase
    .from("team")
    .select(
      `
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
    `
    )
    .in("teamid", teamIds)
    .eq("isactive", true)
    .order("name");

  if (error) {
    throw new Error(`Error al obtener equipos: ${error.message}`);
  }

  // Transform to match our TeamWithSchool type
  return (data || []).map((item) => ({
    teamid: item.teamid,
    name: item.name,
    description: item.description || "",
    isactive: item.isactive,
    participants: item.participants,
    price: item.price,
    schoolid: item.schoolid,
    school: item.school
      ? {
          schoolid: item.school.schoolid,
          name: item.school.name,
          location: item.school.location,
        }
      : undefined,
  })) as TeamWithSchool[];
}

/**
 * Get upcoming session occurrences for current authenticated staff
 * Using session table to calculate occurrences
 */
export async function getUpcomingOccurrencesForTeams(): Promise<
  SessionOccurrence[]
> {
  const supabase = createClient();

  // First get teams for current user
  const teams = await getMyTeams();
  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((t) => t.teamid);

  // Get sessions for these teams
  const { data: sessions, error } = await supabase
    .from("session")
    .select(
      "sessionid, teamid, startdate, enddate, starttime, endtime, daysofweek, repeat"
    )
    .in("teamid", teamIds)
    .order("startdate", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener sesiones: ${error.message}`);
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Generate occurrences based on session schedule
  const today = new Date();
  const occurrences: SessionOccurrence[] = [];

  // Mapeo de días de la semana a números (0 = Domingo)
  const dayMap: { [key: string]: number } = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sábado: 6,
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const session of sessions) {
    // Parsear fechas correctamente
    const sessionStart = new Date(session.startdate + "T00:00:00");
    const sessionEnd = new Date(session.enddate + "T23:59:59");

    // Solo incluir sesiones que no hayan terminado completamente
    if (sessionEnd < today) continue;

    const teamName =
      teams.find((t) => t.teamid === session.teamid)?.name || "Equipo";
    const teamWithLocation = teams.find((t) => t.teamid === session.teamid);
    const location =
      teamWithLocation?.school?.location || "Ubicación no disponible";

    // Obtener el día de la semana de la sesión
    const sessionDayOfWeek = dayMap[session.daysofweek.toLowerCase()];

    if (sessionDayOfWeek === undefined) {
      console.warn(`Día de semana no reconocido: ${session.daysofweek}`);
      continue;
    }

    // Generar todas las ocurrencias semanales en el período
    let currentDate = new Date(sessionStart);

    // Buscar el primer día que coincida con el día de la semana dentro del rango
    while (currentDate <= sessionEnd) {
      if (currentDate.getDay() === sessionDayOfWeek) {
        // Encontramos el primer día que coincide, generar todas las ocurrencias desde aquí
        let occurrenceDate = new Date(currentDate);

        while (occurrenceDate <= sessionEnd) {
          // Solo incluir ocurrencias desde hoy hacia adelante (incluyendo hoy)
          const todayDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          );
          const sessionDate = new Date(
            occurrenceDate.getFullYear(),
            occurrenceDate.getMonth(),
            occurrenceDate.getDate()
          );

          if (sessionDate >= todayDate) {
            const [hours, minutes, seconds] = session.starttime.split(":");
            const [endHours, endMinutes, endSeconds] =
              session.endtime.split(":");

            const startDateTime = new Date(occurrenceDate);
            startDateTime.setHours(
              parseInt(hours),
              parseInt(minutes),
              parseInt(seconds || "0"),
              0
            );

            const endDateTime = new Date(occurrenceDate);
            endDateTime.setHours(
              parseInt(endHours),
              parseInt(endMinutes),
              parseInt(endSeconds || "0"),
              0
            );

            const occurrenceDateStr = occurrenceDate
              .toISOString()
              .split("T")[0];

            occurrences.push({
              id: `${session.sessionid}_${occurrenceDateStr}`,
              sessionid: session.sessionid,
              teamid: session.teamid,
              teamname: teamName,
              starts_at: startDateTime.toISOString(),
              ends_at: endDateTime.toISOString(),
              occurrence_date: occurrenceDateStr,
              location: location,
              status: "scheduled",
            });
          }

          // Avanzar una semana
          occurrenceDate.setDate(occurrenceDate.getDate() + 7);
        }
        break; // Salir del bucle principal una vez que encontramos y procesamos el día
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return occurrences.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  );
}

/**
 * Get active roster (students) for a specific team using enrollment table
 */
export async function getActiveRoster(teamId: string): Promise<Student[]> {
  const supabase = createClient();

  // Get active enrollments with student data
  const { data, error } = await supabase
    .from("enrollment")
    .select(
      `
      studentid,
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
    `
    )
    .eq("teamid", teamId)
    .eq("isactive", true);

  if (error) {
    throw new Error(`Error al obtener roster: ${error.message}`);
  }

  // Transform to Student format and sort by lastname
  const students = (data || []).map((item) => ({
    studentid: item.studentid,
    firstname: item.student.firstname,
    lastname: item.student.lastname,
    dob: item.student.dob,
    grade: item.student.grade,
    ecname: item.student.ecname,
    ecphone: item.student.ecphone,
    ecrelationship: item.student.ecrelationship,
    StudentDismisall: item.student.StudentDismisall,
  })) as Student[];

  // Sort by lastname in JavaScript
  return students.sort((a, b) => a.lastname.localeCompare(b.lastname));
}

/**
 * Get assistance records for a specific session occurrence
 */
export async function getAssistanceForOccurrence(
  occurrenceId: string
): Promise<Assistance[]> {
  const supabase = createClient();

  // Parse composite ID to get sessionid and occurrence_date
  const [sessionId, occurrenceDate] = occurrenceId.split("_");

  const { data, error } = await supabase
    .from("assistance")
    .select("id, sessionid, studentid, assisted, date")
    .eq("sessionid", sessionId)
    .eq("date", occurrenceDate);

  if (error) {
    throw new Error(`Error al obtener asistencia: ${error.message}`);
  }

  return (data || []) as Assistance[];
}

/**
 * Set assistance status for a student in a session
 */
export async function setAssistance(
  occurrenceId: string,
  studentId: string,
  assisted: boolean
): Promise<void> {
  const supabase = createClient();

  // Parse composite ID to get sessionid and occurrence_date
  const [sessionId, occurrenceDate] = occurrenceId.split("_");

  // Check if assistance record already exists for this specific date
  const { data: existingAssistance, error: checkError } = await supabase
    .from("assistance")
    .select("id")
    .eq("sessionid", sessionId)
    .eq("studentid", studentId)
    .eq("date", occurrenceDate)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(
      `Error al verificar asistencia existente: ${checkError.message}`
    );
  }

  if (existingAssistance) {
    // Update existing record
    const { error } = await supabase
      .from("assistance")
      .update({ assisted })
      .eq("id", existingAssistance.id);

    if (error) {
      throw new Error(`Error al actualizar asistencia: ${error.message}`);
    }
  } else {
    // Create new record with the specific date
    const { error } = await supabase.from("assistance").insert({
      sessionid: sessionId,
      studentid: studentId,
      assisted,
      date: occurrenceDate,
    });

    if (error) {
      throw new Error(
        `Error al crear registro de asistencia: ${error.message}`
      );
    }
  }
}

/**
 * Get team details by ID
 */
export async function getTeamById(
  teamId: string
): Promise<TeamWithSchool | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team")
    .select(
      `
      *,
      school:schoolid (
        name,
        location
      )
    `
    )
    .eq("teamid", teamId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Error al obtener equipo: ${error.message}`);
  }

  return data as TeamWithSchool;
}

/**
 * Get student details by ID
 */
export async function getStudentById(
  studentId: string
): Promise<Student | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("student")
    .select("*")
    .eq("studentid", studentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Error al obtener estudiante: ${error.message}`);
  }

  return data as Student;
}
