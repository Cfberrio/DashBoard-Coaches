/**
 * MessageBubble Component
 * Displays a single message in the chat interface
 */

import { Message } from "@/features/coach/messaging-types";

interface MessageBubbleProps {
  message: Message;
  isTemp?: boolean;
}

export function MessageBubble({ message, isTemp = false }: MessageBubbleProps) {
  const isCoach = message.sender_role === "coach";

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
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.body}
        </div>
        {isTemp && (
          <div className="text-xs opacity-75 mt-1 italic">Sending...</div>
        )}
      </div>
    </div>
  );
}
