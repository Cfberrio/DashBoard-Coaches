/**
 * ConversationCard Component
 * Displays a summary of a coach-parent conversation for admin view
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminConversation } from "@/features/admin/messaging-api";
import { MessageSquare, Clock } from "lucide-react";

interface ConversationCardProps {
  conversation: AdminConversation;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationCard({ conversation, isSelected, onClick }: ConversationCardProps) {
  // Format timestamp
  const formattedDate = new Date(conversation.last_message_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Truncate last message for preview
  const messagePreview = conversation.last_message_body.length > 60
    ? conversation.last_message_body.substring(0, 60) + "..."
    : conversation.last_message_body;

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Header: Coach and Parent names */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {conversation.coach_name}
            </h3>
            <p className="text-xs text-gray-600 truncate">
              ↔ {conversation.parent_name}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            <MessageSquare className="h-3 w-3 mr-1" />
            {conversation.message_count}
          </Badge>
        </div>

        {/* Last message preview */}
        <p className="text-xs text-gray-600 line-clamp-2">
          {messagePreview}
        </p>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {formattedDate}
        </div>
      </div>
    </Card>
  );
}
