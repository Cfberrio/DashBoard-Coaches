/**
 * Messaging API functions for Coach Messaging System
 * 
 * CRITICAL NOTES:
 * - coachid references staff(id), NOT staff(staffid)
 * - sender_role must be EXACTLY 'coach' when a coach sends
 * - When sender_role = 'coach', coachid must have value and parentid must be NULL
 */

import { supabase } from "@/lib/supabaseClient";
import { CoachTeam, Message, MessageInsert, ParentWithStudents, BroadcastInfo } from "./messaging-types";

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

  sessions.forEach((session: any) => {
    const team = session.team;
    if (
      team &&
      ["ongoing", "closed"].includes(team.status)
    ) {
      if (!teamMap.has(team.teamid)) {
        teamMap.set(team.teamid, {
          teamid: team.teamid,
          name: team.name,
          status: team.status,
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
  body: string,
  attachment?: {
    attachment_url: string;
    attachment_name: string;
    attachment_type: string;
    attachment_size: number;
  } | null
): Promise<Message> {
  // Validate inputs - body can be empty if there's an attachment
  const trimmedBody = body.trim();

  if (!trimmedBody && !attachment) {
    throw new Error("Message body or attachment is required");
  }

  if (!teamId || !coachId || !parentId) {
    throw new Error("Missing required fields: teamId, parentId, or coachId");
  }

  // Prepare message insert data
  const messageData: MessageInsert = {
    teamid: teamId,
    sender_role: "coach",
    coachid: coachId,
    parentid: parentId,
    body: trimmedBody,
    ...(attachment && {
      attachment_url: attachment.attachment_url,
      attachment_name: attachment.attachment_name,
      attachment_type: attachment.attachment_type,
      attachment_size: attachment.attachment_size,
    }),
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

/**
 * Send broadcast message to all parents in a team.
 * Accepts pre-fetched parentIds to avoid a duplicate DB query.
 * Creates one message record per parent, all sharing the same broadcast_id.
 */
export async function sendBroadcastMessage(
  teamId: string,
  coachId: string,
  body: string,
  parentIds: string[],
  attachment?: {
    attachment_url: string;
    attachment_name: string;
    attachment_type: string;
    attachment_size: number;
  } | null
): Promise<{ broadcast_id: string; sent_count: number }> {
  const trimmedBody = body.trim();

  if (!trimmedBody && !attachment) {
    throw new Error("Message body or attachment is required");
  }

  if (!teamId || !coachId) {
    throw new Error("Missing required fields");
  }

  if (parentIds.length === 0) {
    throw new Error("No parents found for this team");
  }

  const broadcast_id = crypto.randomUUID();

  const messageInserts = parentIds.map((parentId) => ({
    teamid: teamId,
    sender_role: "coach" as const,
    coachid: coachId,
    parentid: parentId,
    body: trimmedBody,
    broadcast_id: broadcast_id,
    ...(attachment && {
      attachment_url: attachment.attachment_url,
      attachment_name: attachment.attachment_name,
      attachment_type: attachment.attachment_type,
      attachment_size: attachment.attachment_size,
    }),
  }));

  const { error } = await supabase
    .from("message")
    .insert(messageInserts);

  if (error) {
    console.error("Error sending broadcast:", error);
    if (error.message?.includes("broadcast_id") || error.code === "42703") {
      throw new Error(
        "The broadcast_id column does not exist in the message table. " +
        "Please run the SQL migration first. " +
        "See INSTRUCCIONES-BROADCAST.md for more details."
      );
    }
    throw new Error(`Failed to send broadcast: ${error.message}`);
  }

  return {
    broadcast_id,
    sent_count: parentIds.length,
  };
}

/**
 * Get all broadcasts sent by a coach for a specific team.
 * Uses a single query and groups client-side to avoid N+1 query problems.
 */
export async function getTeamBroadcasts(
  teamId: string,
  coachId: string
): Promise<BroadcastInfo[]> {
  if (!teamId || !coachId) {
    throw new Error("Team ID and Coach ID are required");
  }

  // Single query: fetch only broadcast messages (broadcast_id is not null)
  const { data: messages, error } = await supabase
    .from("message")
    .select("broadcast_id, teamid, body, created_at, sender_role")
    .eq("teamid", teamId)
    .eq("coachid", coachId)
    .eq("sender_role", "coach")
    .not("broadcast_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching broadcasts:", error);
    if (error.message?.includes("broadcast_id") || error.code === "42703") {
      console.warn("broadcast_id column does not exist. Run the SQL migration first.");
      return [];
    }
    throw new Error(`Error loading broadcasts: ${error.message}`);
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Group client-side by broadcast_id
  const broadcastMap = new Map<string, BroadcastInfo>();

  for (const msg of messages) {
    const bid = msg.broadcast_id as string;
    if (!broadcastMap.has(bid)) {
      broadcastMap.set(bid, {
        broadcast_id: bid,
        teamid: msg.teamid,
        teamname: "",
        body: msg.body,
        created_at: msg.created_at,
        recipient_count: 1,
      });
    } else {
      broadcastMap.get(bid)!.recipient_count += 1;
    }
  }

  return Array.from(broadcastMap.values());
}

/**
 * Get all conversations (individual threads) resulting from a broadcast
 */
export async function getBroadcastConversations(
  broadcastId: string
): Promise<Array<{ parentid: string; parent_name: string; last_message: Message }>> {
  if (!broadcastId) {
    throw new Error("Broadcast ID is required");
  }

  // Get all messages from this broadcast
  const { data: messages, error } = await supabase
    .from("message")
    .select("*, parent:parentid(firstname, lastname)")
    .eq("broadcast_id", broadcastId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching broadcast conversations:", error);
    throw new Error(`Error loading conversations: ${error.message}`);
  }

  // Group by parentid to get one entry per parent
  const conversationMap = new Map();

  for (const msg of messages || []) {
    if (msg.parentid && !conversationMap.has(msg.parentid)) {
      conversationMap.set(msg.parentid, {
        parentid: msg.parentid,
        parent_name: `${msg.parent?.firstname} ${msg.parent?.lastname}`,
        last_message: msg,
      });
    }
  }

  return Array.from(conversationMap.values());
}
