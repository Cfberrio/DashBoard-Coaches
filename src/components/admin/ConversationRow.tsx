/**
 * ConversationRow Component
 * Displays a single conversation in the admin messages table
 * Can be expanded to show full message history
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { AdminConversation } from "@/features/admin/messaging-api";
import { useConversationMessages } from "@/features/admin/messaging-hooks";
import { AdminMessageBubble } from "./AdminMessageBubble";

interface ConversationRowProps {
  conversation: AdminConversation;
  teamId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ConversationRow({
  conversation,
  teamId,
  isExpanded,
  onToggle,
}: ConversationRowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only fetch messages when expanded
  const {
    data: messages = [],
    isLoading: messagesLoading,
    realtimeConnected,
  } = useConversationMessages(
    isExpanded ? teamId : null,
    isExpanded ? conversation.coachid : null,
    isExpanded ? conversation.parentid : null
  );

  // Auto-scroll to bottom when messages load or update
  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isExpanded]);

  // Format date as relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Truncate message preview
  const messagePreview = conversation.last_message_body.length > 50
    ? conversation.last_message_body.substring(0, 50) + "..."
    : conversation.last_message_body;

  return (
    <>
      {/* Main row - always visible */}
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors ${
          isExpanded
            ? "bg-blue-50 hover:bg-blue-100"
            : "hover:bg-gray-50"
        }`}
      >
        {/* Expand/Collapse Icon */}
        <td className="px-4 py-3 text-gray-600">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>

        {/* Coach Name */}
        <td className="px-4 py-3 font-medium text-gray-900">
          {conversation.coach_name}
        </td>

        {/* Parent Name */}
        <td className="px-4 py-3 text-gray-700">
          {conversation.parent_name}
        </td>

        {/* Message Count */}
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {conversation.message_count}
          </span>
        </td>

        {/* Last Message Preview */}
        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
          {messagePreview}
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {formatRelativeTime(conversation.last_message_at)}
        </td>
      </tr>

      {/* Expanded row - shows message history */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 py-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Conversation: {conversation.coach_name} ↔ {conversation.parent_name}
                </h3>
                {realtimeConnected && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <span className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {messagesLoading ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No messages in this conversation
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <AdminMessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
