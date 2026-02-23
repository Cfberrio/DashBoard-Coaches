/**
 * MessageBubble Component
 * Displays a single message in the chat interface
 */

import { Message } from "@/features/coach/messaging-types";
import { AttachmentDisplay } from "./AttachmentDisplay";

interface MessageBubbleProps {
  message: Message;
  isTemp?: boolean;
}

export function MessageBubble({ message, isTemp = false }: MessageBubbleProps) {
  const isCoach = message.sender_role === "coach";
  const hasAttachment = !!message.attachment_url;

  // Format timestamp
  const formattedDate = new Date(message.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex ${isCoach ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isCoach
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-900"
        } ${isTemp ? "opacity-60" : ""}`}
      >
        <div className="text-xs opacity-75 mb-1">
          {isCoach ? "You" : "Parent"} • {formattedDate}
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
        {isTemp && (
          <div className="text-xs opacity-75 mt-1 italic">Sending...</div>
        )}
      </div>
    </div>
  );
}
