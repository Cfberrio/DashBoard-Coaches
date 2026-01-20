/**
 * ChatPanel Component
 * Main chat interface with realtime updates
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTeamMessages, useSendMessage } from "@/features/coach/messaging-hooks";
import { Message } from "@/features/coach/messaging-types";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatPanelProps {
  teamId: string;
  parentId: string;
  parentName: string;
  coachId: string;
}

export function ChatPanel({ teamId, parentId, parentName, coachId }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages with realtime updates
  const {
    data: messages = [],
    isLoading,
    error,
    realtimeConnected,
  } = useTeamMessages(teamId, parentId);

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  // Combine server messages with optimistic messages
  const allMessages = [...messages, ...optimisticMessages];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  // Clear optimistic messages when server message arrives
  useEffect(() => {
    if (optimisticMessages.length > 0 && messages.length > 0) {
      // Remove optimistic messages that now exist in server messages
      setOptimisticMessages((prev) =>
        prev.filter(
          (optMsg) => !messages.some((serverMsg) => serverMsg.body === optMsg.body)
        )
      );
    }
  }, [messages, optimisticMessages.length]);

  const handleSendMessage = async () => {
    const body = text.trim();

    if (!body || sendMessageMutation.isPending) return;

    // Clear input immediately
    setText("");

    // Create optimistic message
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      teamid: teamId,
      sender_role: "coach",
      parentid: parentId,
      coachid: coachId,
      body,
      created_at: new Date().toISOString(),
    };

    // Add to optimistic messages
    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      // Send message to server
      await sendMessageMutation.mutateAsync({ teamId, parentId, coachId, body });
    } catch (error) {
      console.error("Error sending message:", error);
      // Revert optimistic update on error
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.id !== tempMessage.id)
      );
      // Restore text so user can retry
      setText(body);
      alert("Error sending message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p className="text-sm">Error loading messages: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg shadow-sm bg-white">
      {/* Realtime connection indicator */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Conversation with {parentName}
          </h3>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                realtimeConnected ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className="text-xs text-gray-600">
              {realtimeConnected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="h-96 overflow-y-auto p-4">
        {allMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-2">Start a conversation with {parentName}</p>
          </div>
        ) : (
          <>
            {allMessages.map((message) => {
              const isTemp = message.id.startsWith("temp_");
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isTemp={isTemp}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={`Write a message to ${parentName}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!text.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? "Sending..." : "Send"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, or click the Send button
        </p>
      </div>
    </div>
  );
}
