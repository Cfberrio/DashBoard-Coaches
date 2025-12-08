import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { replaceTemplateVariables, CoachTemplateData } from "@/lib/email-template-utils";
import nodemailer from "nodemailer";

// Support both SMTP_* and GMAIL_* environment variables for backwards compatibility
const SMTP_HOST = process.env.SMTP_HOST || process.env.GMAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Coach System";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface SendCoachEmailRequest {
  teamIds: string[];
  subject: string;
  content: string;
  isHtml: boolean;
}

interface CoachData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  teams: Array<{
    teamid: string;
    name: string;
    sport: string | null;
    school: {
      name: string;
      location: string;
    } | null;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== Starting email campaign ===");
    
    // Validate SMTP configuration
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM_EMAIL) {
      console.error("SMTP configuration is incomplete");
      console.error("Current values:", {
        SMTP_HOST: SMTP_HOST || "missing",
        SMTP_PORT: SMTP_PORT,
        SMTP_USER: SMTP_USER ? "configured" : "missing",
        SMTP_PASSWORD: SMTP_PASSWORD ? "configured" : "missing",
        SMTP_FROM_EMAIL: SMTP_FROM_EMAIL || "missing",
      });
      console.error("Looking for: GMAIL_USER, GMAIL_APP_PASSWORD or SMTP_USER, SMTP_PASSWORD");
      return NextResponse.json(
        { 
          error: "SMTP configuration is incomplete. Please check your .env.local file",
          hint: "Required: GMAIL_USER and GMAIL_APP_PASSWORD (or SMTP_* equivalents)"
        },
        { status: 500 }
      );
    }

    console.log("SMTP Configuration loaded:", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      from: SMTP_FROM_EMAIL,
    });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Supabase environment variables are not configured");
      return NextResponse.json(
        { error: "Supabase configuration is missing" },
        { status: 500 }
      );
    }

    const body: SendCoachEmailRequest = await request.json();
    console.log("Request body:", { teamIds: body.teamIds, hasSubject: !!body.subject, hasContent: !!body.content });

    // Validate input data
    if (!body.teamIds || body.teamIds.length === 0) {
      return NextResponse.json(
        { error: "You must select at least one team" },
        { status: 400 }
      );
    }

    if (!body.subject || !body.content) {
      return NextResponse.json(
        { error: "Subject and content are required" },
        { status: 400 }
      );
    }

    // Create Supabase client for server
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    console.log("Supabase client created successfully");

    // 1. Get unique coaches from selected teams
    console.log("Querying sessions for teams:", body.teamIds);
    
    const { data: sessions, error: sessionsError } = await supabase
      .from("session")
      .select(`
        coachid,
        teamid,
        team:teamid (
          teamid,
          name,
          sport,
          school:schoolid (
            name,
            location
          )
        ),
        staff:coachid (
          id,
          name,
          email,
          phone
        )
      `)
      .in("teamid", body.teamIds);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: `Error fetching sessions: ${sessionsError.message}`, details: sessionsError },
        { status: 500 }
      );
    }

    console.log(`Sessions found: ${sessions?.length || 0}`);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "No coaches found for the selected teams" },
        { status: 404 }
      );
    }

    // 2. Group by coach (remove duplicates)
    const coachMap = new Map<string, CoachData>();

    sessions.forEach((session: Record<string, unknown>) => {
      // Handle relations that can come as object or array
      const coach = Array.isArray(session.staff) 
        ? session.staff[0] 
        : session.staff;
      const team = Array.isArray(session.team)
        ? session.team[0]
        : session.team;

      if (!coach || !team) {
        console.warn("Session without coach or team:", { 
          hasCoach: !!coach, 
          hasTeam: !!team,
          sessionData: session 
        });
        return;
      }

      if (!coachMap.has(coach.id)) {
        coachMap.set(coach.id, {
          id: coach.id,
          name: coach.name || "",
          email: coach.email || "",
          phone: coach.phone || null,
          teams: [],
        });
      }

      const coachData = coachMap.get(coach.id)!;
      
      // Avoid duplicate teams for the same coach
      const teamExists = coachData.teams.some((t) => t.teamid === team.teamid);
      if (!teamExists) {
        // Handle school that can come as object or array
        const schoolData = Array.isArray(team.school) && team.school.length > 0
          ? team.school[0]
          : team.school;

        coachData.teams.push({
          teamid: team.teamid,
          name: team.name || "",
          sport: team.sport || null,
          school: schoolData
            ? {
                name: schoolData.name || "",
                location: schoolData.location || "",
              }
            : null,
        });
      }
    });

    console.log(`Unique coaches found: ${coachMap.size}`);
    
    // 3. Create SMTP transporter
    console.log("Creating SMTP transporter...");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log("SMTP connection verified successfully");
    } catch (error) {
      console.error("SMTP connection error:", error);
      return NextResponse.json(
        { error: "Failed to connect to SMTP server. Please check your SMTP configuration." },
        { status: 500 }
      );
    }
    
    // 4. Send personalized email to each coach
    const results = {
      total: coachMap.size,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ coach: string; error: string }>,
    };

    for (const coachData of coachMap.values()) {
      console.log(`Processing coach: ${coachData.name} (${coachData.email})`);
      try {
        // Validate email
        if (!coachData.email || !isValidEmail(coachData.email)) {
          results.failed++;
          results.errors.push({
            coach: coachData.name,
            error: "Invalid email",
          });
          continue;
        }

        // Prepare template data for each coach's teams
        // If the coach has multiple teams, use the first one for individual variables
        const firstTeam = coachData.teams[0];
        const teamNames = coachData.teams.map((t) => t.name).join(", ");

        const templateData: CoachTemplateData = {
          COACH_NAME: coachData.name,
          COACH_EMAIL: coachData.email,
          COACH_PHONE: coachData.phone || "",
          TEAM_NAME: firstTeam?.name || "",
          TEAM_NAMES: teamNames,
          SCHOOL_NAME: firstTeam?.school?.name || "",
          SCHOOL_LOCATION: firstTeam?.school?.location || "",
          SPORT: firstTeam?.sport || "",
        };

        // Replace variables in subject and content
        const personalizedSubject = replaceTemplateVariables(
          body.subject,
          templateData
        );
        const personalizedContent = replaceTemplateVariables(
          body.content,
          templateData
        );

        // Prepare email options
        const mailOptions: {
          from: string;
          to: string;
          subject: string;
          html?: string;
          text?: string;
        } = {
          from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
          to: coachData.email,
          subject: personalizedSubject,
        };

        if (body.isHtml) {
          mailOptions.html = personalizedContent;
        } else {
          mailOptions.text = personalizedContent;
        }

        // Send email
        console.log("Sending email via SMTP...");
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${coachData.email}`);
        results.sent++;
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push({
          coach: coachData.name,
          error: errorMessage,
        });
        console.error(`Error sending email to ${coachData.name}:`, error);
      }
    }

    console.log("=== Sending summary ===", results);
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error in send-coach-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        error: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
