/**
 * AttachmentDisplay Component
 * Renders media attachments inline in chat bubbles.
 * - Images: shown as thumbnails, click to open full size
 * - Videos: inline player with controls
 * - Other: download link with file name and size
 */

"use client";

import { isImageType, isVideoType, formatFileSize } from "@/lib/uploadAttachment";
import { Download, FileIcon, ImageIcon, VideoIcon } from "lucide-react";

interface AttachmentDisplayProps {
  url: string;
  name: string;
  type: string | null | undefined;
  size: number | null | undefined;
  isCoach?: boolean;
}

export function AttachmentDisplay({
  url,
  name,
  type,
  size,
  isCoach = false,
}: AttachmentDisplayProps) {
  if (isImageType(type)) {
    return (
      <div className="mt-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={name}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
        <div className={`text-xs mt-1 flex items-center gap-1 ${isCoach ? "opacity-75" : "opacity-60"}`}>
          <ImageIcon className="h-3 w-3" />
          <span>{name}</span>
          {size && <span>({formatFileSize(size)})</span>}
        </div>
      </div>
    );
  }

  if (isVideoType(type)) {
    return (
      <div className="mt-2">
        <video
          src={url}
          controls
          preload="metadata"
          className="max-w-xs max-h-64 rounded-lg"
        >
          Your browser does not support video playback.
        </video>
        <div className={`text-xs mt-1 flex items-center gap-1 ${isCoach ? "opacity-75" : "opacity-60"}`}>
          <VideoIcon className="h-3 w-3" />
          <span>{name}</span>
          {size && <span>({formatFileSize(size)})</span>}
        </div>
      </div>
    );
  }

  // Other file types - download link
  return (
    <div className="mt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={name}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          isCoach
            ? "border-blue-300 bg-blue-400/30 hover:bg-blue-400/50 text-white"
            : "border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-900"
        }`}
      >
        <FileIcon className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {size && (
            <div className={`text-xs ${isCoach ? "opacity-75" : "opacity-60"}`}>
              {formatFileSize(size)}
            </div>
          )}
        </div>
        <Download className="h-4 w-4 shrink-0" />
      </a>
    </div>
  );
}
