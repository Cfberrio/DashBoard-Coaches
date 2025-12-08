import { supabase } from "@/lib/supabaseClient";
import {
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
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("No hay usuario autenticado");
  }

  // Buscar staff por id (usando el id del usuario autenticado)
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
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
    .eq("id", user.id)
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
      status,
      isactive,
      isongoing,
      participants, 
      price,
      schoolid,
      created_at,
      school:schoolid (
        schoolid,
        name,
        location
      )
    `
    )
    .in("teamid", teamIds)
    .in("status", ["ongoing", "closed"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener equipos: ${error.message}`);
  }

  // Transform to match our TeamWithSchool type
  return (data || []).map((item) => {
    const schoolData = Array.isArray(item.school) && item.school.length > 0 
      ? item.school[0] 
      : item.school;
    
    return {
      teamid: item.teamid,
      name: item.name,
      description: item.description || "",
      status: item.status,
      isactive: item.isactive,
      participants: item.participants,
      price: item.price,
      schoolid: item.schoolid,
      school: schoolData
        ? {
            schoolid: (schoolData as { schoolid: number; name: string; location: string }).schoolid,
            name: (schoolData as { schoolid: number; name: string; location: string }).name,
            location: (schoolData as { schoolid: number; name: string; location: string }).location,
          }
        : undefined,
    };
  }) as TeamWithSchool[];
}

/**
 * Get upcoming session occurrences for current authenticated staff
 * Using session table to calculate occurrences
 */
export async function getUpcomingOccurrencesForTeams(): Promise<
  SessionOccurrence[]
> {
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

  // Mapeo de días de la semana a números (0 = Sunday)
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
    const currentDate = new Date(sessionStart);

    // Buscar el primer día que coincida con el día de la semana dentro del rango
    while (currentDate <= sessionEnd) {
      if (currentDate.getDay() === sessionDayOfWeek) {
        // Encontramos el primer día que coincide, generar todas las ocurrencias desde aquí
        const occurrenceDate = new Date(currentDate);

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
  const students = (data || []).map((item) => {
    const student = Array.isArray(item.student) && item.student.length > 0 
      ? item.student[0] 
      : item.student;
    
    return {
      studentid: item.studentid,
      firstname: (student as { firstname: string })?.firstname || '',
      lastname: (student as { lastname: string })?.lastname || '',
      dob: (student as { dob?: string })?.dob,
      grade: (student as { grade?: string })?.grade,
      ecname: (student as { ecname?: string })?.ecname,
      ecphone: (student as { ecphone?: string })?.ecphone,
      ecrelationship: (student as { ecrelationship?: string })?.ecrelationship,
      StudentDismisall: (student as { StudentDismisall?: string })?.StudentDismisall,
    };
  }) as Student[];

  // Sort by lastname in JavaScript
  return students.sort((a, b) => a.lastname.localeCompare(b.lastname));
}

/**
 * Get assistance records for a specific session occurrence
 */
export async function getAssistanceForOccurrence(
  occurrenceId: string
): Promise<Assistance[]> {
  console.log("📋 getAssistanceForOccurrence called:", occurrenceId);
  
  // Parse composite ID to get sessionid and occurrence_date
  // Format is: sessionid_YYYY-MM-DD, where sessionid is a UUID
  const lastUnderscoreIndex = occurrenceId.lastIndexOf("_");
  const sessionId = occurrenceId.substring(0, lastUnderscoreIndex);
  const occurrenceDate = occurrenceId.substring(lastUnderscoreIndex + 1);
  console.log("📅 Querying assistance for:", { sessionId, occurrenceDate, originalId: occurrenceId });

  const { data, error } = await supabase
    .from("assistance")
    .select("id, sessionid, studentid, assisted, date")
    .eq("sessionid", sessionId)
    .eq("date", occurrenceDate);

  if (error) {
    console.error("❌ Error getting assistance:", error);
    throw new Error(`Error al obtener asistencia: ${error.message}`);
  }

  console.log("📊 Assistance data retrieved:", data?.length || 0, "records");
  console.log("📋 Assistance details:", data);

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
  console.log("🔄 setAssistance called:", { occurrenceId, studentId, assisted });
  
  // Parse composite ID to get sessionid and occurrence_date
  // Format is: sessionid_YYYY-MM-DD, where sessionid is a UUID
  const lastUnderscoreIndex = occurrenceId.lastIndexOf("_");
  const sessionId = occurrenceId.substring(0, lastUnderscoreIndex);
  const occurrenceDate = occurrenceId.substring(lastUnderscoreIndex + 1);
  console.log("📅 Parsed IDs:", { sessionId, occurrenceDate, originalId: occurrenceId });

  // Check if assistance record already exists for this specific date
  const { data: existingAssistance, error: checkError } = await supabase
    .from("assistance")
    .select("id")
    .eq("sessionid", sessionId)
    .eq("studentid", studentId)
    .eq("date", occurrenceDate)
    .maybeSingle();

  if (checkError) {
    console.error("❌ Error checking existing assistance:", checkError);
    throw new Error(
      `Error al verificar asistencia existente: ${checkError.message}`
    );
  }

  console.log("🔍 Existing assistance:", existingAssistance);

  if (existingAssistance) {
    // Update existing record
    console.log("🔄 Updating existing record...");
    const { error } = await supabase
      .from("assistance")
      .update({ assisted })
      .eq("id", existingAssistance.id);

    if (error) {
      console.error("❌ Error updating assistance:", error);
      throw new Error(`Error al actualizar asistencia: ${error.message}`);
    }
    console.log("✅ Assistance updated successfully");
  } else {
    // Create new record with the specific date
    console.log("➕ Creating new record...");
    const { error } = await supabase.from("assistance").insert({
      sessionid: sessionId,
      studentid: studentId,
      assisted,
      date: occurrenceDate,
    });

    if (error) {
      console.error("❌ Error creating assistance:", error);
      throw new Error(
        `Error al crear registro de asistencia: ${error.message}`
      );
    }
    console.log("✅ Assistance created successfully");
  }
}

/**
 * Get team details by ID
 */
export async function getTeamById(
  teamId: string
): Promise<TeamWithSchool | null> {
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
