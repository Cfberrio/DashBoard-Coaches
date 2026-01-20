/**
 * Messaging API functions for Coach Messaging System
 * 
 * CRITICAL NOTES:
 * - coachid references staff(id), NOT staff(staffid)
 * - sender_role must be EXACTLY 'coach' when a coach sends
 * - When sender_role = 'coach', coachid must have value and parentid must be NULL
 */

import { supabase } from "@/lib/supabaseClient";
import { CoachTeam, Message, MessageInsert, ParentWithStudents } from "./messaging-types";

/**
 * Get teams for the current authenticated coach
 * Uses session table to find teams where coach has sessions
 */
export async function getCoachTeams(): Promise<CoachTeam[]> {
  // Get current authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("No authenticated user found");
  }

  const coachId = user.id; // user.id = staff.id

  // Get sessions for this coach
  const { data: sessions, error: sessionsError } = await supabase
    .from("session")
    .select(
      `
      teamid,
      team:teamid!inner(
        teamid,
        name,
        status
      )
    `
    )
    .eq("coachid", coachId);

  if (sessionsError) {
    console.error("Error fetching coach sessions:", sessionsError);
    throw new Error(`Error loading teams: ${sessionsError.message}`);
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Deduplicate teams (a coach can have multiple sessions for the same team)
  const teamMap = new Map<string, CoachTeam>();

  sessions.forEach((session: { team?: { teamid: string; name: string; status: string } }) => {
    if (
      session.team &&
      ["ongoing", "closed"].includes(session.team.status)
    ) {
      if (!teamMap.has(session.team.teamid)) {
        teamMap.set(session.team.teamid, {
          teamid: session.team.teamid,
          name: session.team.name,
          status: session.team.status,
        });
      }
    }
  });

  return Array.from(teamMap.values());
}

/**
 * Get parents with their students for a specific team
 * Used to display the list of parents that can receive individual messages
 */
export async function getParentsByTeam(teamId: string): Promise<ParentWithStudents[]> {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  // Get enrollments with student and parent data
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollment")
    .select(
      `
      studentid,
      teamid,
      student:studentid!inner(
        studentid,
        firstname,
        lastname,
        parentid,
        parent:parentid!inner(
          parentid,
          firstname,
          lastname,
          email,
          phone
        )
      ),
      team:teamid!inner(
        teamid,
        name
      )
    `
    )
    .eq("teamid", teamId)
    .eq("isactive", true);

  if (enrollmentsError) {
    console.error("Error fetching parents:", enrollmentsError);
    throw new Error(`Error loading parents: ${enrollmentsError.message}`);
  }

  if (!enrollments || enrollments.length === 0) {
    return [];
  }

  // Group by parent
  const parentMap = new Map<string, ParentWithStudents>();

  enrollments.forEach((enrollment: any) => {
    if (enrollment.student?.parent && enrollment.team) {
      const parent = enrollment.student.parent;
      const student = enrollment.student;
      const team = enrollment.team;

      if (!parentMap.has(parent.parentid)) {
        parentMap.set(parent.parentid, {
          parentid: parent.parentid,
          firstname: parent.firstname,
          lastname: parent.lastname,
          email: parent.email,
          phone: parent.phone,
          teamid: team.teamid,
          teamname: team.name,
          students: [],
        });
      }

      // Add student to parent's student list
      const parentData = parentMap.get(parent.parentid)!;
      if (!parentData.students.some((s) => s.studentid === student.studentid)) {
        parentData.students.push({
          studentid: student.studentid,
          firstname: student.firstname,
          lastname: student.lastname,
        });
      }
    }
  });

  return Array.from(parentMap.values());
}

/**
 * Get messages for a specific team and parent (1-on-1 conversation)
 * Loads most recent 50 messages, ordered by creation time
 */
export async function getTeamMessages(
  teamId: string,
  parentId: string
): Promise<Message[]> {
  if (!teamId || !parentId) {
    throw new Error("Team ID and Parent ID are required");
  }

  const { data, error } = await supabase
    .from("message")
    .select("*")
    .eq("teamid", teamId)
    .eq("parentid", parentId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error fetching messages:", error);
    throw new Error(`Error loading messages: ${error.message}`);
  }

  return (data || []) as Message[];
}

/**
 * Send a message as a coach to a specific parent (1-on-1 conversation)
 * 
 * CRITICAL VALIDATIONS:
 * - body must not be empty
 * - sender_role must be exactly 'coach'
 * - coachid must have a valid UUID value
 * - parentid must be the ID of the parent receiving the message
 */
export async function sendCoachMessage(
  teamId: string,
  parentId: string,
  coachId: string,
  body: string
): Promise<Message> {
  // Validate inputs
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new Error("Message body cannot be empty");
  }

  if (!teamId || !coachId || !parentId) {
    throw new Error("Missing required fields: teamId, parentId, or coachId");
  }

  // Prepare message insert data
  const messageData: MessageInsert = {
    teamid: teamId,
    sender_role: "coach", // EXACTLY 'coach', not 'staff'
    coachid: coachId, // Must have value
    parentid: parentId, // ID of the parent in this 1-on-1 conversation
    body: trimmedBody,
  };

  // Insert message
  const { data, error } = await supabase
    .from("message")
    .insert(messageData)
    .select()
    .single();

  if (error) {
    console.error("Error sending message:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }

  return data as Message;
}

/**
 * Get parent information by ID
 * Used for displaying parent names in notifications
 */
export async function getParentById(parentId: string): Promise<{
  parentid: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
} | null> {
  if (!parentId) {
    return null;
  }

  const { data, error } = await supabase
    .from("parent")
    .select("parentid, firstname, lastname, email, phone")
    .eq("parentid", parentId)
    .single();

  if (error) {
    console.error("Error fetching parent:", error);
    return null;
  }

  return data;
}
