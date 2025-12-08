"use client";

import { useState } from "react";
import { TeamMultiSelector } from "./team-multi-selector";
import { CoachPreview } from "./coach-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SendStatus = "idle" | "success" | "error";

interface SendResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ coach: string; error: string }>;
}

export function CoachEmailCampaign() {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isHtml, setIsHtml] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const handleSend = async () => {
    if (selectedTeamIds.length === 0) {
      alert("You must select at least one team");
      return;
    }

    if (!subject.trim()) {
      alert("Subject is required");
      return;
    }

    if (!content.trim()) {
      alert("Content is required");
      return;
    }

    setIsSending(true);
    setSendStatus("idle");
    setSendResult(null);

    try {
      const response = await fetch("/api/marketing/send-coach-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamIds: selectedTeamIds,
          subject: subject.trim(),
          content: content.trim(),
          isHtml,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error sending emails");
      }

      setSendResult(data.results);
      setSendStatus("success");
    } catch (error) {
      console.error("Error sending campaign:", error);
      setSendStatus("error");
      alert(
        error instanceof Error ? error.message : "Unknown error sending emails"
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Coach Email Campaign</h2>
        <p className="text-muted-foreground mt-1">
          Select teams and send personalized emails to assigned coaches
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <TeamMultiSelector
            selectedTeamIds={selectedTeamIds}
            onSelectionChange={setSelectedTeamIds}
          />

          <CoachPreview selectedTeamIds={selectedTeamIds} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Subject
                </label>
                <Input
                  type="text"
                  placeholder="E.g., Session Reminder"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Content
                </label>
                <textarea
                  className={cn(
                    "flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                  placeholder="Write your email content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHtml"
                  checked={isHtml}
                  onChange={(e) => setIsHtml(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isHtml" className="text-sm">
                  HTML Content
                </label>
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium mb-2">
                  Available variables:
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{COACH_NAME}"}
                    </code>{" "}
                    - Coach name
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{COACH_EMAIL}"}
                    </code>{" "}
                    - Coach email
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{COACH_PHONE}"}
                    </code>{" "}
                    - Coach phone
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{TEAM_NAME}"}
                    </code>{" "}
                    - Team name (first team)
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{TEAM_NAMES}"}
                    </code>{" "}
                    - List of teams they coach
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{SCHOOL_NAME}"}
                    </code>{" "}
                    - School name
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{SCHOOL_LOCATION}"}
                    </code>{" "}
                    - School location
                  </div>
                  <div>
                    <code className="bg-background px-1 py-0.5 rounded">
                      {"{SPORT}"}
                    </code>{" "}
                    - Team sport
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSend}
                disabled={isSending || selectedTeamIds.length === 0}
                className="w-full"
              >
                {isSending ? "Sending..." : "Send Campaign"}
              </Button>
            </CardContent>
          </Card>

          {sendStatus === "success" && sendResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Campaign Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Total coaches:</span>{" "}
                    {sendResult.total}
                  </div>
                  <div className="text-green-600">
                    <span className="font-medium">Successfully sent:</span>{" "}
                    {sendResult.sent}
                  </div>
                  {sendResult.failed > 0 && (
                    <div className="text-red-600">
                      <span className="font-medium">Failed:</span>{" "}
                      {sendResult.failed}
                    </div>
                  )}
                  {sendResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {sendResult.errors.map((error, index) => (
                          <li key={index}>
                            {error.coach}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {sendStatus === "error" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  There was an error sending the campaign. Please try again.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
