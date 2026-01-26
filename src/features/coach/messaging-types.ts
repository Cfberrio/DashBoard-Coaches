/**
 * Message Types for Coach Messaging System
 * 
 * IMPORTANT: These types match the existing Supabase message table structure
 */

export interface Message {
  id: string;
  teamid: string;
  sender_role: 'parent' | 'coach';
  parentid: string | null;
  coachid: string | null;
  body: string;
  created_at: string;
  broadcast_id?: string | null;  // NUEVO CAMPO: UUID compartido por mensajes broadcast
}

export interface CoachTeam {
  teamid: string;
  name: string;
  status?: string;
  studentCount?: number;
}

export interface ParentWithStudents {
  parentid: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  teamid: string;
  teamname: string;
  students: Array<{
    studentid: string;
    firstname: string;
    lastname: string;
  }>;
}

export interface MessageInsert {
  teamid: string;
  sender_role: 'coach';
  coachid: string;
  parentid: string;  // Now required - ID of the parent in 1-on-1 conversation
  body: string;
}

// Nuevo tipo para insert de mensaje broadcast
export interface BroadcastMessageInsert {
  teamid: string;
  sender_role: 'coach';
  coachid: string;
  body: string;
  broadcast_id: string;  // UUID compartido por todo el broadcast
}

// Nuevo tipo para información de broadcast
export interface BroadcastInfo {
  broadcast_id: string;
  teamid: string;
  teamname: string;
  body: string;
  created_at: string;
  recipient_count: number;
  response_count: number;
}
