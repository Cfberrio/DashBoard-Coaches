/**
 * AdminMessageBubble Component
 * Displays a single message in the admin conversation view (read-only)
 */

import { ConversationMessage } from "@/features/admin/messaging-api";
import { AttachmentDisplay } from "@/components/coach-messages/AttachmentDisplay";

interface AdminMessageBubbleProps {
  message: ConversationMessage;
}

export function AdminMessageBubble({ message }: AdminMessageBubbleProps) {
  const isCoach = message.sender_role === "coach";
  const hasAttachment = !!message.attachment_url;

  // Format timestamp
  const formattedDate = new Date(message.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get sender name
  const senderName = isCoach 
    ? message.coach_name || "Coach"
    : message.parent_name || "Parent";

  return (
    <div
      className={`flex ${isCoach ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isCoach
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-900"
        }`}
      >
        <div className="text-xs opacity-75 mb-1">
          {senderName} • {formattedDate}
        </div>
        {message.body && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.body}
          </div>
        )}
        {hasAttachment && (
          <AttachmentDisplay
            url={message.attachment_url!}
            name={message.attachment_name || "Attachment"}
            type={message.attachment_type}
            size={message.attachment_size}
            isCoach={isCoach}
          />
        )}
      </div>
    </div>
  );
}
