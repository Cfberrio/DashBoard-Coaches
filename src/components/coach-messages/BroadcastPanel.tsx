/**
 * BroadcastPanel Component
 * Panel for composing and sending broadcast messages to entire team
 */

"use client";

import { useState } from "react";
import { useSendBroadcast, useParentsByTeam } from "@/features/coach/messaging-hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Users } from "lucide-react";

interface BroadcastPanelProps {
  teamId: string;
  coachId: string;
}

export function BroadcastPanel({ teamId, coachId }: BroadcastPanelProps) {
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: parents = [] } = useParentsByTeam(teamId);
  const sendBroadcast = useSendBroadcast();

  const handleSend = async () => {
    if (!message.trim() || sendBroadcast.isPending) return;

    try {
      const result = await sendBroadcast.mutateAsync({
        teamId,
        coachId,
        body: message.trim(),
      });

      setMessage("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      alert("Error sending message. Please try again.");
    }
  };

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
        disabled={sendBroadcast.isPending}
        className="min-h-32"
      />

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={!message.trim() || sendBroadcast.isPending || parents.length === 0}
        className="w-full"
      >
        {sendBroadcast.isPending
          ? "Sending..."
          : `Send to ${parents.length} parents`}
      </Button>

      {parents.length === 0 && (
        <p className="text-sm text-amber-600">
          No parents in this team. Make sure there are enrolled students.
        </p>
      )}
    </div>
  );
}
