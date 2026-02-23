/**
 * BroadcastPanel Component
 * Panel for composing and sending broadcast messages (with attachments) to entire team
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useSendBroadcast, useParentsByTeam } from "@/features/coach/messaging-hooks";
import { uploadAttachment, isImageType, formatFileSize } from "@/lib/uploadAttachment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Users, Paperclip, X, ImageIcon, VideoIcon, FileIcon, Loader2 } from "lucide-react";

interface BroadcastPanelProps {
  teamId: string;
  coachId: string;
}

export function BroadcastPanel({ teamId, coachId }: BroadcastPanelProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: parents = [] } = useParentsByTeam(teamId);
  const sendBroadcast = useSendBroadcast();

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

    if (file.size > 25 * 1024 * 1024) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Maximum size is 25MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);

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

  const getFileIcon = () => {
    if (!selectedFile) return <FileIcon className="h-4 w-4" />;
    if (isImageType(selectedFile.type)) return <ImageIcon className="h-4 w-4" />;
    if (selectedFile.type.startsWith("video/")) return <VideoIcon className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const handleSend = async () => {
    const hasText = message.trim().length > 0;
    const hasFile = !!selectedFile;

    if ((!hasText && !hasFile) || sendBroadcast.isPending || isUploading) return;

    setUploadError(null);

    try {
      let attachmentData = null;

      if (hasFile) {
        setIsUploading(true);
        try {
          attachmentData = await uploadAttachment(selectedFile!, coachId);
        } catch (uploadErr: any) {
          console.error("Error uploading attachment:", uploadErr);
          setUploadError(uploadErr.message || "Failed to upload file");
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      handleRemoveFile();

      await sendBroadcast.mutateAsync({
        teamId,
        coachId,
        body: message.trim(),
        attachment: attachmentData,
      });

      setMessage("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      alert("Error sending message. Please try again.");
    }
  };

  const isBusy = sendBroadcast.isPending || isUploading;
  const canSend = (message.trim() || selectedFile) && !isBusy && parents.length > 0;

  return (
    <div className="space-y-4">
      {/* Parent count indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="h-4 w-4" />
        <span>
          This message will be sent to {parents.length}{" "}
          {parents.length === 1 ? "parent" : "parents"}
        </span>
      </div>

      {/* Success message */}
      {showSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Message sent successfully to {parents.length} parents
          </AlertDescription>
        </Alert>
      )}

      {/* Message textarea */}
      <Textarea
        placeholder="Write your message for the entire team..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isBusy}
        className="min-h-32"
      />

      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
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
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-red-600">{uploadError}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Attach
        </Button>
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : sendBroadcast.isPending ? (
            "Sending..."
          ) : (
            `Send to ${parents.length} parents`
          )}
        </Button>
      </div>

      {parents.length === 0 && (
        <p className="text-sm text-amber-600">
          No parents in this team. Make sure there are enrolled students.
        </p>
      )}
    </div>
  );
}
