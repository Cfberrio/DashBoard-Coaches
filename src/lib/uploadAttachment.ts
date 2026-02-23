/**
 * Upload Attachment Utility
 * Uploads files to the Supabase "attachements" storage bucket
 * and returns the public URL with file metadata.
 */

import { supabase } from "@/lib/supabaseClient";

const BUCKET_NAME = "attachements";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export interface AttachmentData {
  attachment_url: string;
  attachment_name: string;
  attachment_type: string;
  attachment_size: number;
}

/**
 * Upload a file to Supabase Storage and return its public URL + metadata.
 *
 * @param file - The File object to upload
 * @param coachId - The coach's ID, used to namespace the upload path
 * @returns AttachmentData with the public URL and file metadata
 */
export async function uploadAttachment(
  file: File,
  coachId: string
): Promise<AttachmentData> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File is too large. Maximum size is 25MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
    );
  }

  // Sanitize filename: remove special characters, keep extension
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const filePath = `messages/${coachId}/${timestamp}_${sanitized}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading attachment:", uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to get public URL for uploaded file");
  }

  return {
    attachment_url: urlData.publicUrl,
    attachment_name: file.name,
    attachment_type: file.type,
    attachment_size: file.size,
  };
}

/**
 * Check if a MIME type represents an image
 */
export function isImageType(mimeType: string | null | undefined): boolean {
  return !!mimeType && mimeType.startsWith("image/");
}

/**
 * Check if a MIME type represents a video
 */
export function isVideoType(mimeType: string | null | undefined): boolean {
  return !!mimeType && mimeType.startsWith("video/");
}

/**
 * Format file size in human-readable form
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
