/**
 * useCoachNotifications Hook
 * 
 * Sistema de notificaciones basado en Base de Datos para Coaches
 * Reemplaza el sistema anterior basado en localStorage
 * 
 * Funcionalidades:
 * - Obtiene conteos de mensajes no leídos desde Supabase
 * - Agrupa notificaciones por conversación (team + parent)
 * - Marca mensajes como leídos en la tabla message_read_status
 * - Actualiza en tiempo real con Supabase Realtime
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
   * Carga los conteos de mensajes no leídos desde la base de datos
   * Usa la función RPC get_coach_unread_counts
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
        
        // Detectar si es un error de función no encontrada
        const errorMessage = rpcError.message || '';
        if (errorMessage.includes('function') || errorMessage.includes('does not exist') || !errorMessage) {
          setMigrationNeeded(true);
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('🚨 MIGRACIÓN SQL NO EJECUTADA');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          console.error('La función get_coach_unread_counts no existe en Supabase.');
          console.error('');
          console.error('📋 PASOS PARA SOLUCIONAR:');
          console.error('');
          console.error('1. Ve a: https://supabase.com/dashboard');
          console.error('2. Selecciona tu proyecto');
          console.error('3. Click en "SQL Editor" (menú lateral)');
          console.error('4. Click en "New Query"');
          console.error('5. Copia el archivo: supabase/migrations/EJECUTAR-PRIMERO.sql');
          console.error('6. Pega todo el contenido y haz click en "Run"');
          console.error('7. Recarga esta página');
          console.error('');
          console.error('📁 Archivo: supabase/migrations/EJECUTAR-PRIMERO.sql');
          console.error('');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('');
          
          setError('Migración SQL no ejecutada. Ver consola para instrucciones.');
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

      // Calcular total de mensajes no leídos
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
   * Marca todos los mensajes de una conversación específica como leídos
   * @param teamId - ID del team
   * @param parentId - ID del parent
   */
  const markAsRead = useCallback(
    async (teamId: string, parentId: string) => {
      if (!coachId) {
        console.warn('⚠️ Cannot mark as read: no coachId');
        return;
      }

      try {
        console.log(`📖 Marking conversation as read: team=${teamId}, parent=${parentId}`);

        // 1. Obtener todos los mensajes NO LEÍDOS de esta conversación
        // Solo mensajes de PARENTS (que el coach necesita leer)
        const { data: unreadMessages, error: fetchError } = await supabase
          .from('message')
          .select('id')
          .eq('teamid', teamId)
          .eq('parentid', parentId)
          .eq('coachid', coachId)
          .eq('sender_role', 'parent');  // Solo mensajes de parents

        if (fetchError) {
          console.error('❌ Error fetching unread messages:', fetchError);
          throw fetchError;
        }

        if (!unreadMessages || unreadMessages.length === 0) {
          console.log('✅ No unread messages to mark');
          return;
        }

        console.log(`📝 Found ${unreadMessages.length} messages to potentially mark as read`);

        // 2. Verificar cuáles ya están marcados como leídos
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

        // 3. Insertar registros en message_read_status
        const readRecords = toMarkAsRead.map((msg) => ({
          messageid: msg.id,
          coachid: coachId,
          parentid: null,  // NULL para coaches (ver constraint en tabla)
        }));

        const { error: insertError } = await supabase
          .from('message_read_status')
          .insert(readRecords);

        if (insertError) {
          console.error('❌ Error inserting read status:', insertError);
          throw insertError;
        }

        console.log('✅ Successfully marked messages as read');

        // 4. Recargar conteos para actualizar UI
        await loadUnreadCounts();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Error marking messages as read:', errorMessage);
        // No lanzar el error para no interrumpir la navegación
      }
    },
    [coachId, loadUnreadCounts]
  );

  /**
   * Obtiene el conteo de mensajes no leídos para una conversación específica
   * @param teamId - ID del team
   * @param parentId - ID del parent
   * @returns Número de mensajes no leídos
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
  // EFECTO: Carga inicial de conteos
  // ============================================================================
  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // ============================================================================
  // EFECTO: Polling - Recargar conteos cada 10 segundos (Fallback sin Realtime)
  // ============================================================================
  useEffect(() => {
    if (!coachId) return;

    console.log(`🔄 Starting polling for coach: ${coachId}`);

    // Polling cada 10 segundos
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
