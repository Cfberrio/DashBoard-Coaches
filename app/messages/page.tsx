/**
 * Messages Page
 * Route: /messages
 * 
 * This is a server component that wraps the client-side messaging interface
 */

"use client";

import { CoachMessagesClient } from "@/components/coach-messages/CoachMessagesClient";
import { CoachDataProvider } from "@/features/coach/wiring";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

export default function MessagesPage() {
  return (
    <NotificationsProvider>
      <CoachDataProvider>
        <CoachMessagesClient />
      </CoachDataProvider>
    </NotificationsProvider>
  );
}
