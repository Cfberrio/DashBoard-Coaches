/**
 * React Query hooks for Admin Messaging System
 * Includes Realtime subscriptions for live message updates
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getConversationsByTeam, getConversationMessages } from "./messaging-api";

// Query keys
export const ADMIN_MESSAGING_QUERY_KEYS = {
  conversations: (teamId: string) => ["admin", "conversations", teamId] as const,
  conversationMessages: (teamId: string, coachId: string, parentId: string) => 
    ["admin", "conversationMessages", teamId, coachId, parentId] as const,
};

/**
 * Hook to get all conversations for a specific team with Realtime updates
 * Returns conversations grouped by coach-parent pairs
 */
export function useAdminConversations(teamId: string | null) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Query for conversations
  const query = useQuery({
    queryKey: ADMIN_MESSAGING_QUERY_KEYS.conversations(teamId || ""),
    queryFn: () => getConversationsByTeam(teamId!),
    enabled: !!teamId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Realtime subscription
  useEffect(() => {
    if (!teamId) return;

    console.log(`🔌 Admin: Setting up Realtime subscription for team conversations: ${teamId}`);

    const channel = supabase
      .channel(`admin-conversations:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message",
          filter: `teamid=eq.${teamId}`,
        },
        (payload: any) => {
          console.log("📨 Admin Realtime: conversation update:", payload.eventType);

          // Invalidate conversations query to refetch
          queryClient.invalidateQueries({
            queryKey: ADMIN_MESSAGING_QUERY_KEYS.conversations(teamId),
          });
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Admin Realtime subscription status for team ${teamId}:`, status);
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`🔌 Admin: Cleaning up Realtime subscription for team: ${teamId}`);
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  return {
    ...query,
    realtimeConnected,
  };
}

/**
 * Hook to get full message history for a specific conversation with Realtime updates
 * Returns all messages between a coach and parent in a team
 */
export function useConversationMessages(
  teamId: string | null,
  coachId: string | null,
  parentId: string | null
) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Query for messages
  const query = useQuery({
    queryKey: ADMIN_MESSAGING_QUERY_KEYS.conversationMessages(
      teamId || "",
      coachId || "",
      parentId || ""
    ),
    queryFn: () => getConversationMessages(teamId!, coachId!, parentId!),
    enabled: !!teamId && !!coachId && !!parentId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Realtime subscription
  useEffect(() => {
    if (!teamId || !coachId || !parentId) return;

    console.log(
      `🔌 Admin: Setting up Realtime subscription for conversation: team=${teamId}, coach=${coachId}, parent=${parentId}`
    );

    const channel = supabase
      .channel(`admin-conversation:${teamId}:${coachId}:${parentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message",
          filter: `teamid=eq.${teamId}`,
        },
        (payload: any) => {
          console.log("📨 Admin Realtime: message event:", payload.eventType);

          // Check if this message belongs to the current conversation
          const newMessage = payload.new;
          if (
            newMessage &&
            newMessage.coachid === coachId &&
            newMessage.parentid === parentId
          ) {
            // Invalidate messages query to refetch
            queryClient.invalidateQueries({
              queryKey: ADMIN_MESSAGING_QUERY_KEYS.conversationMessages(
                teamId,
                coachId,
                parentId
              ),
            });

            // Also invalidate conversations list to update last message
            queryClient.invalidateQueries({
              queryKey: ADMIN_MESSAGING_QUERY_KEYS.conversations(teamId),
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(
          `🔔 Admin Realtime subscription status for conversation:`,
          status
        );
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(
        `🔌 Admin: Cleaning up Realtime subscription for conversation: team=${teamId}, coach=${coachId}, parent=${parentId}`
      );
      supabase.removeChannel(channel);
    };
  }, [teamId, coachId, parentId, queryClient]);

  return {
    ...query,
    realtimeConnected,
  };
}
