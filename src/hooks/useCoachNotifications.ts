/**
 * useCoachNotifications Hook
 * 
 * Database-based notification system for Coaches
 * Replaces the previous localStorage-based system
 * 
 * Features:
 * - Retrieves unread message counts from Supabase
 * - Groups notifications by conversation (team + parent)
 * - Marks messages as read in the message_read_status table
 * - Updates in real-time with Supabase Realtime
 */

"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface CoachNotificationItem {
  teamid: string;
  teamname: string;
  parentid: string;
  parentname: string;
  unread_count: number;
}

export function useCoachNotifications(coachId: string | null) {
  const [notifications, setNotifications] = useState<CoachNotificationItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  /**
   * Loads unread message counts from the database
   * Uses the RPC function get_coach_unread_counts
   */
  const loadUnreadCounts = useCallback(async () => {
    if (!coachId) {
      setLoading(false);
      setNotifications([]);
      setTotalUnread(0);
      return;
    }

    try {
      setError(null);
      
      console.log('📊 Loading unread counts for coach:', coachId);

      const { data, error: rpcError } = await supabase.rpc('get_coach_unread_counts', {
        p_coachid: coachId,
      });

      if (rpcError) {
        console.error('❌ Error calling get_coach_unread_counts:', rpcError);
        
        // Detect if it's a function not found error
        const errorMessage = rpcError.message || '';
        if (errorMessage.includes('function') || errorMessage.includes('does not exist') || !errorMessage) {
          setMigrationNeeded(true);
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🚨 SQL MIGRATION NOT EXECUTED');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          console.error('The function get_coach_unread_counts does not exist in Supabase.');
          console.error('');
          console.error('📋 STEPS TO FIX:');
          console.error('');
          console.error('1. Go to: https://supabase.com/dashboard');
          console.error('2. Select your project');
          console.error('3. Click on "SQL Editor" (sidebar menu)');
          console.error('4. Click on "New Query"');
          console.error('5. Copy the file: supabase/migrations/EJECUTAR-PRIMERO.sql');
          console.error('6. Paste all content and click "Run"');
          console.error('7. Reload this page');
          console.error('');
          console.error('📁 File: supabase/migrations/EJECUTAR-PRIMERO.sql');
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          
          setError('SQL migration not executed. Check console for instructions.');
          setNotifications([]);
          setTotalUnread(0);
          setLoading(false);
          return;
        }
        
        throw rpcError;
      }

      console.log('✅ Unread counts loaded:', data);

      const notificationItems = (data || []) as CoachNotificationItem[];
      setNotifications(notificationItems);

      // Calculate total unread messages
      const total = notificationItems.reduce(
        (sum, item) => sum + parseInt(String(item.unread_count)),
        0
      );
      setTotalUnread(total);

      console.log(`📊 Total unread: ${total} across ${notificationItems.length} conversations`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error loading unread counts:', errorMessage);
      setError(errorMessage);
      setNotifications([]);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  /**
   * Marks all messages from a specific conversation as read
   * @param teamId - Team ID
   * @param parentId - Parent ID
   */
  const markAsRead = useCallback(
    async (teamId: string, parentId: string) => {
      if (!coachId) {
        console.warn('⚠️ Cannot mark as read: no coachId');
        return;
      }

      try {
        console.log(`📖 Marking conversation as read: team=${teamId}, parent=${parentId}`);

        // 1. Get all UNREAD messages from this conversation
        // Only messages from PARENTS (that the coach needs to read)
        const { data: unreadMessages, error: fetchError } = await supabase
          .from('message')
          .select('id')
          .eq('teamid', teamId)
          .eq('parentid', parentId)
          .eq('coachid', coachId)
          .eq('sender_role', 'parent');  // Only messages from parents

        if (fetchError) {
          console.error('❌ Error fetching unread messages:', fetchError);
          throw fetchError;
        }

        if (!unreadMessages || unreadMessages.length === 0) {
          console.log('✅ No unread messages to mark');
          return;
        }

        console.log(`📝 Found ${unreadMessages.length} messages to potentially mark as read`);

        // 2. Check which ones are already marked as read
        const { data: alreadyRead, error: checkError } = await supabase
          .from('message_read_status')
          .select('messageid')
          .eq('coachid', coachId)
          .in('messageid', unreadMessages.map((m) => m.id));

        if (checkError) {
          console.error('❌ Error checking read status:', checkError);
          throw checkError;
        }

        const alreadyReadIds = new Set(alreadyRead?.map((r) => r.messageid) || []);
        const toMarkAsRead = unreadMessages.filter((m) => !alreadyReadIds.has(m.id));

        if (toMarkAsRead.length === 0) {
          console.log('✅ All messages already marked as read');
          return;
        }

        console.log(`📝 Marking ${toMarkAsRead.length} messages as read`);

        // 3. Insert records in message_read_status
        const readRecords = toMarkAsRead.map((msg) => ({
          messageid: msg.id,
          coachid: coachId,
          parentid: null,  // NULL for coaches (see table constraint)
        }));

        const { error: insertError } = await supabase
          .from('message_read_status')
          .insert(readRecords);

        if (insertError) {
          console.error('❌ Error inserting read status:', insertError);
          throw insertError;
        }

        console.log('✅ Successfully marked messages as read');

        // 4. Reload counts to update UI
        await loadUnreadCounts();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Error marking messages as read:', errorMessage);
        // Don't throw the error to avoid interrupting navigation
      }
    },
    [coachId, loadUnreadCounts]
  );

  /**
   * Gets the unread message count for a specific conversation
   * @param teamId - Team ID
   * @param parentId - Parent ID
   * @returns Number of unread messages
   */
  const getUnreadCount = useCallback(
    (teamId: string, parentId: string): number => {
      const found = notifications.find(
        (item) => item.teamid === teamId && item.parentid === parentId
      );
      return found ? parseInt(String(found.unread_count)) : 0;
    },
    [notifications]
  );

  // ============================================================================
  // EFFECT: Initial load of counts
  // ============================================================================
  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // ============================================================================
  // EFFECT: Polling - Reload counts every 10 seconds (Fallback without Realtime)
  // ============================================================================
  useEffect(() => {
    if (!coachId) return;

    console.log(`🔄 Starting polling for coach: ${coachId}`);

    // Polling every 10 seconds
    const interval = setInterval(() => {
      loadUnreadCounts();
    }, 10000);

    return () => {
      console.log('🔄 Stopping polling');
      clearInterval(interval);
    };
  }, [coachId, loadUnreadCounts]);

  return {
    notifications,
    totalUnread,
    loading,
    error,
    migrationNeeded,
    markAsRead,
    refreshCounts: loadUnreadCounts,
    getUnreadCount,
  };
}
