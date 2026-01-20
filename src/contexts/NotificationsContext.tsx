/**
 * NotificationsContext
 * Manages unread message notifications for coaches
 * Uses localStorage for basic persistence across page reloads
 */

"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export interface UnreadMessage {
  messageId: string;
  teamId: string;
  parentId: string;
  parentName: string;
  teamName: string;
  body: string;
  created_at: string;
}

interface NotificationsContextType {
  unreadMessages: UnreadMessage[];
  unreadCount: number;
  unreadByParent: Map<string, { count: number; parentName: string; teamName: string }>;
  addUnreadMessage: (message: UnreadMessage) => void;
  markConversationAsRead: (teamId: string, parentId: string) => void;
  clearAllNotifications: () => void;
  isConversationActive: (teamId: string, parentId: string) => boolean;
  setActiveConversation: (teamId: string | null, parentId: string | null) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

const STORAGE_KEY = "coach_unread_messages";

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUnreadMessages(parsed);
      }
    } catch (error) {
      console.error("Error loading unread messages from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever unreadMessages changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unreadMessages));
    } catch (error) {
      console.error("Error saving unread messages to localStorage:", error);
    }
  }, [unreadMessages]);

  // Calculate unread count
  const unreadCount = unreadMessages.length;

  // Group unread messages by parent
  const unreadByParent = new Map<string, { count: number; parentName: string; teamName: string }>();
  unreadMessages.forEach((msg) => {
    const key = `${msg.teamId}-${msg.parentId}`;
    const existing = unreadByParent.get(key);
    if (existing) {
      existing.count++;
    } else {
      unreadByParent.set(key, {
        count: 1,
        parentName: msg.parentName,
        teamName: msg.teamName,
      });
    }
  });

  const addUnreadMessage = useCallback((message: UnreadMessage) => {
    setUnreadMessages((prev) => {
      // Avoid duplicates
      const exists = prev.some((m) => m.messageId === message.messageId);
      if (exists) return prev;
      
      return [...prev, message];
    });
  }, []);

  const markConversationAsRead = useCallback((teamId: string, parentId: string) => {
    setUnreadMessages((prev) =>
      prev.filter((msg) => !(msg.teamId === teamId && msg.parentId === parentId))
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setUnreadMessages([]);
  }, []);

  const isConversationActive = useCallback(
    (teamId: string, parentId: string) => {
      return activeTeamId === teamId && activeParentId === parentId;
    },
    [activeTeamId, activeParentId]
  );

  const setActiveConversation = useCallback(
    (teamId: string | null, parentId: string | null) => {
      setActiveTeamId(teamId);
      setActiveParentId(parentId);
      
      // Mark as read when opening conversation
      if (teamId && parentId) {
        markConversationAsRead(teamId, parentId);
      }
    },
    [markConversationAsRead]
  );

  const value: NotificationsContextType = {
    unreadMessages,
    unreadCount,
    unreadByParent,
    addUnreadMessage,
    markConversationAsRead,
    clearAllNotifications,
    isConversationActive,
    setActiveConversation,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
