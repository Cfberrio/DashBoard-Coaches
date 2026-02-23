/**
 * ChatPanel Component
 * Main chat interface with realtime updates and media attachments
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTeamMessages, useSendMessage } from "@/features/coach/messaging-hooks";
import { Message } from "@/features/coach/messaging-types";
import { uploadAttachment, isImageType, formatFileSize } from "@/lib/uploadAttachment";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, X, ImageIcon, VideoIcon, FileIcon, Loader2 } from "lucide-react";

interface ChatPanelProps {
  teamId: string;
  parentId: string;
  parentName: string;
  coachId: string;
}

export function ChatPanel({ teamId, parentId, parentName, coachId }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setOptimisticMessages((prev) =>
        prev.filter(
          (optMsg) => !messages.some((serverMsg) => serverMsg.body === optMsg.body)
        )
      );
    }
  }, [messages, optimisticMessages.length]);

  // Cleanup file preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Maximum size is 25MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (isImageType(file.type)) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async () => {
    const body = text.trim();
    const hasFile = !!selectedFile;

    if ((!body && !hasFile) || sendMessageMutation.isPending || isUploading) return;

    // Clear input immediately
    setText("");
    setUploadError(null);

    // Create optimistic message
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      teamid: teamId,
      sender_role: "coach",
      parentid: parentId,
      coachid: coachId,
      body,
      created_at: new Date().toISOString(),
      // Use local preview URL for optimistic display
      ...(selectedFile && filePreviewUrl && isImageType(selectedFile.type) && {
        attachment_url: filePreviewUrl,
        attachment_name: selectedFile.name,
        attachment_type: selectedFile.type,
        attachment_size: selectedFile.size,
      }),
    };

    setOptimisticMessages((prev) => [...prev, tempMessage]);

    try {
      let attachmentData = null;

      // Upload file if present
      if (hasFile) {
        setIsUploading(true);
        try {
          attachmentData = await uploadAttachment(selectedFile!, coachId);
        } catch (uploadErr: any) {
          console.error("Error uploading attachment:", uploadErr);
          setUploadError(uploadErr.message || "Failed to upload file");
          setIsUploading(false);
          // Revert optimistic update
          setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
          setText(body);
          return;
        }
        setIsUploading(false);
      }

      // Clear file state before sending
      handleRemoveFile();

      // Send message to server
      await sendMessageMutation.mutateAsync({
        teamId,
        parentId,
        coachId,
        body,
        attachment: attachmentData,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
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

  const getFileIcon = () => {
    if (!selectedFile) return <FileIcon className="h-4 w-4" />;
    if (isImageType(selectedFile.type)) return <ImageIcon className="h-4 w-4" />;
    if (selectedFile.type.startsWith("video/")) return <VideoIcon className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
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

  const isBusy = sendMessageMutation.isPending || isUploading;
  const canSend = (text.trim() || selectedFile) && !isBusy;

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

      {/* File preview area */}
      {selectedFile && (
        <div className="px-4 pt-3 border-t bg-gray-50">
          <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
            {/* Image thumbnail preview */}
            {filePreviewUrl && isImageType(selectedFile.type) ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                {getFileIcon()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1 hover:bg-gray-100 rounded"
              disabled={isBusy}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 pt-2">
          <p className="text-xs text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Attachment button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            title="Attach photo or video"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            placeholder={`Write a message to ${parentName}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!canSend}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Uploading...
              </>
            ) : sendMessageMutation.isPending ? (
              "Sending..."
            ) : (
              "Send"
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send. Click <Paperclip className="h-3 w-3 inline" /> to attach a photo or video (max 25MB).
        </p>
      </div>
    </div>
  );
}
