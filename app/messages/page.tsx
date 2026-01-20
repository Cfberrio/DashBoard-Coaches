/**
 * Messages Page
 * Route: /messages
 * 
 * This is a server component that wraps the client-side messaging interface
 */

"use client";

import { Suspense } from "react";
import { CoachMessagesClient } from "@/components/coach-messages/CoachMessagesClient";
import { CoachDataProvider } from "@/features/coach/wiring";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

export default function MessagesPage() {
  return (
    <NotificationsProvider>
      <CoachDataProvider>
        <Suspense fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading messages...</p>
            </div>
          </div>
        }>
          <CoachMessagesClient />
        </Suspense>
      </CoachDataProvider>
    </NotificationsProvider>
  );
}
