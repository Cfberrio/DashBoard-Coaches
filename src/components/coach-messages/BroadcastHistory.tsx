/**
 * BroadcastHistory Component
 * Displays list of previous broadcast messages sent to the team
 */

"use client";

import { BroadcastInfo } from "@/features/coach/messaging-types";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

interface BroadcastHistoryProps {
  broadcasts: BroadcastInfo[];
  isLoading: boolean;
}

export function BroadcastHistory({ broadcasts, isLoading }: BroadcastHistoryProps) {
  if (isLoading) {
    return <div className="text-center text-gray-500 py-4">Loading...</div>;
  }

  if (broadcasts.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">You haven't sent any messages to this team yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {broadcasts.map((broadcast) => (
        <Card key={broadcast.broadcast_id} className="p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-900 line-clamp-2 mb-2">
            {broadcast.body}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {format(new Date(broadcast.created_at), "PPp")}
            </span>
            <span>•</span>
            <span>Sent to {broadcast.recipient_count} parents</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
