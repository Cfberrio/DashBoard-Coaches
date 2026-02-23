/**
 * Admin Messaging API Functions
 * Allows admins to view all coach-parent conversations across teams
 */

import { supabase } from "@/lib/supabaseClient";

export interface AdminConversation {
  coachid: string;
  parentid: string;
  teamid: string;
  coach_name: string;
  parent_name: string;
  last_message_at: string;
  last_message_body: string;
  message_count: number;
}

export interface ConversationMessage {
  id: string;
  teamid: string;
  sender_role: 'parent' | 'coach';
  parentid: string | null;
  coachid: string | null;
  body: string;
  created_at: string;
  coach_name?: string;
  parent_name?: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

/**
 * Get all unique coach-parent conversations for a specific team
 * Groups messages by coach+parent pair with summary info
 */
export async function getConversationsByTeam(teamId: string): Promise<AdminConversation[]> {
  try {
    // Get all messages for the team with coach and parent info
    const { data: messages, error } = await supabase
      .from("message")
      .select(`
        coachid,
        parentid,
        teamid,
        body,
        created_at,
        coach:coachid!inner(
          id,
          name
        ),
        parent:parentid!inner(
          parentid,
          firstname,
          lastname
        )
      `)
      .eq("teamid", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Group messages by coach+parent pair
    const conversationMap = new Map<string, AdminConversation>();

    messages.forEach((msg: any) => {
      // Skip messages without both coach and parent (broadcasts, etc)
      if (!msg.coachid || !msg.parentid) return;

      const key = `${msg.coachid}-${msg.parentid}`;
      
      const coach = Array.isArray(msg.coach) ? msg.coach[0] : msg.coach;
      const parent = Array.isArray(msg.parent) ? msg.parent[0] : msg.parent;

      if (!coach || !parent) return;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          coachid: msg.coachid,
          parentid: msg.parentid,
          teamid: msg.teamid,
          coach_name: coach.name || "Unknown Coach",
          parent_name: `${parent.firstname || ""} ${parent.lastname || ""}`.trim() || "Unknown Parent",
          last_message_at: msg.created_at,
          last_message_body: msg.body,
          message_count: 1,
        });
      } else {
        const conv = conversationMap.get(key)!;
        conv.message_count += 1;
        
        // Update last message if this one is newer
        if (new Date(msg.created_at) > new Date(conv.last_message_at)) {
          conv.last_message_at = msg.created_at;
          conv.last_message_body = msg.body;
        }
      }
    });

    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationMap.values());
    conversations.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );

    return conversations;
  } catch (error) {
    console.error("Error in getConversationsByTeam:", error);
    throw error;
  }
}

/**
 * Get full message history for a specific coach-parent conversation
 * Returns all messages ordered chronologically
 */
export async function getConversationMessages(
  teamId: string,
  coachId: string,
  parentId: string
): Promise<ConversationMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from("message")
      .select(`
        id,
        teamid,
        sender_role,
        parentid,
        coachid,
        body,
        created_at,
        attachment_url,
        attachment_name,
        attachment_type,
        attachment_size,
        coach:coachid(
          name
        ),
        parent:parentid(
          firstname,
          lastname
        )
      `)
      .eq("teamid", teamId)
      .eq("coachid", coachId)
      .eq("parentid", parentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching conversation messages:", error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    if (!messages) {
      return [];
    }

    // Format messages with sender names
    return messages.map((msg: any) => {
      const coach = Array.isArray(msg.coach) ? msg.coach[0] : msg.coach;
      const parent = Array.isArray(msg.parent) ? msg.parent[0] : msg.parent;

      return {
        id: msg.id,
        teamid: msg.teamid,
        sender_role: msg.sender_role,
        parentid: msg.parentid,
        coachid: msg.coachid,
        body: msg.body,
        created_at: msg.created_at,
        coach_name: coach?.name || "Unknown Coach",
        parent_name: parent 
          ? `${parent.firstname || ""} ${parent.lastname || ""}`.trim() || "Unknown Parent"
          : "Unknown Parent",
        attachment_url: msg.attachment_url || null,
        attachment_name: msg.attachment_name || null,
        attachment_type: msg.attachment_type || null,
        attachment_size: msg.attachment_size || null,
      };
    });
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    throw error;
  }
}
