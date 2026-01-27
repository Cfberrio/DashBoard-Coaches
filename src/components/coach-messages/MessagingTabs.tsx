/**
 * MessagingTabs Component
 * Main wrapper that provides tab navigation between individual and broadcast messaging
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoachMessagesClient } from "./CoachMessagesClient";
import { BroadcastMessagesClient } from "./BroadcastMessagesClient";
import { MessageSquare, Users } from "lucide-react";

export function MessagingTabs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="individual" className="w-full">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Individual Messages
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Messages
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="individual" className="mt-0">
          <CoachMessagesClient />
        </TabsContent>

        <TabsContent value="broadcast" className="mt-0">
          <BroadcastMessagesClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
