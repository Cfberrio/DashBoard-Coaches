/**
 * React Query hooks for Coach Messaging System
 * Includes Realtime subscriptions for live message updates
 */

import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { getCoachTeams, getTeamMessages, sendCoachMessage, getParentsByTeam, sendBroadcastMessage, getTeamBroadcasts, getBroadcastConversations } from "./messaging-api";
import { Message } from "./messaging-types";

// Query keys
export const MESSAGING_QUERY_KEYS = {
  coachTeams: ["messaging", "coachTeams"] as const,
  parentsByTeam: (teamId: string) => ["messaging", "parents", teamId] as const,
  teamMessages: (teamId: string, parentId: string) => ["messaging", "teamMessages", teamId, parentId] as const,
  currentCoach: ["messaging", "currentCoach"] as const,
};

/**
 * Hook to get current coach ID from authenticated user
 */
export function useCurrentCoachId() {
  return useQuery({
    queryKey: MESSAGING_QUERY_KEYS.currentCoach,
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        throw new Error("No authenticated user");
      }

      return user.id;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get teams for current coach
 */
export function useCoachTeams() {
  return useQuery({
    queryKey: MESSAGING_QUERY_KEYS.coachTeams,
    queryFn: getCoachTeams,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}

/**
 * Hook to get parents by team with their students
 */
export function useParentsByTeam(teamId: string | null) {
  return useQuery({
    queryKey: MESSAGING_QUERY_KEYS.parentsByTeam(teamId || ""),
    queryFn: () => getParentsByTeam(teamId!),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get messages for a specific team and parent (1-on-1 conversation) with Realtime updates
 */
export function useTeamMessages(teamId: string | null, parentId: string | null) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Query for messages
  const query = useQuery({
    queryKey: MESSAGING_QUERY_KEYS.teamMessages(teamId || "", parentId || ""),
    queryFn: () => getTeamMessages(teamId!, parentId!),
    enabled: !!teamId && !!parentId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Realtime subscription
  useEffect(() => {
    if (!teamId || !parentId) return;

    console.log(`🔌 Setting up Realtime subscription for team: ${teamId}, parent: ${parentId}`);

    const channel = supabase
      .channel(`coach-messages:${teamId}:${parentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message",
          filter: `teamid=eq.${teamId}`,  // Only filter by team - Realtime doesn't support comma-separated filters
        },
        (payload: any) => {
          console.log("📨 Realtime message event:", payload.eventType, payload);

          // Filter by parentId on the client side
          const messageParentId = payload.new?.parentid || payload.old?.parentid;
          if (messageParentId !== parentId) {
            console.log(`⏭️ Skipping message - different parent (${messageParentId} !== ${parentId})`);
            return; // Ignore messages from other parents
          }

          const queryKey = MESSAGING_QUERY_KEYS.teamMessages(teamId, parentId);

          if (payload.eventType === "INSERT") {
            // Add new message to cache
            queryClient.setQueryData<Message[]>(queryKey, (old = []) => {
              // Avoid duplicates (optimistic update might already have it)
              const exists = old.some((m) => m.id === payload.new.id);
              if (exists) return old;
              return [...old, payload.new as Message];
            });
          } else if (payload.eventType === "UPDATE") {
            // Update existing message
            queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
              old.map((m) =>
                m.id === payload.new.id ? (payload.new as Message) : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            // Remove deleted message
            queryClient.setQueryData<Message[]>(queryKey, (old = []) =>
              old.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("🔌 Realtime subscription status:", status);
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // Cleanup function - CRITICAL
    return () => {
      console.log(`🔌 Cleaning up Realtime subscription for team: ${teamId}, parent: ${parentId}`);
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [teamId, parentId, queryClient]);

  return {
    ...query,
    realtimeConnected,
  };
}

/**
 * Mutation hook to send a message as coach to a specific parent
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      parentId,
      coachId,
      body,
    }: {
      teamId: string;
      parentId: string;
      coachId: string;
      body: string;
    }) => sendCoachMessage(teamId, parentId, coachId, body),
    onSuccess: (newMessage, variables) => {
      console.log("✅ Message sent successfully:", newMessage);
      
      // Invalidate and refetch messages for this team-parent conversation
      const queryKey = MESSAGING_QUERY_KEYS.teamMessages(variables.teamId, variables.parentId);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error("❌ Error sending message:", error);
    },
  });
}

/**
 * Global hook to monitor ALL incoming messages from parents for notifications
 * Only adds to notifications if:
 * 1. sender_role = 'parent'
 * 2. Not currently viewing that conversation
 */
export function useGlobalMessageNotifications(
  coachId: string | null,
  onNewMessage?: (message: Message) => void | Promise<void>
) {
  const [connected, setConnected] = useState(false);
  const onNewMessageRef = useRef(onNewMessage);

  // Keep ref updated without triggering effect re-run
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    if (!coachId) {
      console.log("🔔 No coachId - skipping notifications setup");
      return;
    }

    console.log(`🔔 Setting up global notifications subscription for coach: ${coachId}`);

    // Subscribe to ALL messages where this coach is involved
    const channel = supabase
      .channel(`coach-notifications:${coachId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message",
          filter: `coachid=eq.${coachId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          console.log("🔔 New message received via Realtime:", {
            id: newMessage.id,
            sender_role: newMessage.sender_role,
            teamid: newMessage.teamid,
            parentid: newMessage.parentid,
            body: newMessage.body.substring(0, 50),
          });

          // Only create notification if message is from a parent
          if (newMessage.sender_role === "parent") {
            console.log("✅ Message is from parent - calling onNewMessage");
            const result = onNewMessageRef.current?.(newMessage);
            // Handle async callback
            if (result && typeof result.then === 'function') {
              result.catch((error) => {
                console.error("❌ Error in onNewMessage callback:", error);
              });
            }
          } else {
            console.log("⏭️ Message is from coach - ignoring");
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 Global notifications subscription status:", status);
        setConnected(status === "SUBSCRIBED");
        
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to notifications channel");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to notifications channel");
        }
      });

    return () => {
      console.log(`🔔 Cleaning up global notifications subscription for coach: ${coachId}`);
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [coachId]); // Only re-run if coachId changes

  return { connected };
}

/**
 * Hook to send broadcast message to entire team
 */
export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      coachId,
      body,
    }: {
      teamId: string;
      coachId: string;
      body: string;
    }) => sendBroadcastMessage(teamId, coachId, body),
    onSuccess: (_, variables) => {
      // Invalidate broadcasts query for this team
      queryClient.invalidateQueries({
        queryKey: ["team-broadcasts", variables.teamId, variables.coachId],
      });
    },
  });
}

/**
 * Hook to get all broadcasts for a team
 */
export function useTeamBroadcasts(teamId: string | null, coachId: string | null) {
  return useQuery({
    queryKey: ["team-broadcasts", teamId, coachId],
    queryFn: () => getTeamBroadcasts(teamId!, coachId!),
    enabled: !!teamId && !!coachId,
    staleTime: 30000,
  });
}

/**
 * Hook to get conversations from a specific broadcast
 */
export function useBroadcastConversations(broadcastId: string | null) {
  return useQuery({
    queryKey: ["broadcast-conversations", broadcastId],
    queryFn: () => getBroadcastConversations(broadcastId!),
    enabled: !!broadcastId,
  });
}
