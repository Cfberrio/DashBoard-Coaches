// deno-lint-ignore-file
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { 
  auth: { persistSession: false }
});

interface AttendanceSummary {
  teamid: string;
  teamname: string;
  total_sessions: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  absent_count: number;
  attendance_rate: number;
}

interface StudentAbsence {
  studentid: string;
  firstname: string;
  lastname: string;
  teamname: string;
  absence_count: number;
}

interface ReportData {
  staffId: string;
  staffName: string;
  staffEmail: string;
  teams: AttendanceSummary[];
  topAbsentees: StudentAbsence[];
  weekStart: string;
  weekEnd: string;
}

serve(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    
    // Calculate week range (last 7 days) in Miami timezone
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const to = now;
    
    const fromISO = from.toISOString();
    const toISO = to.toISOString();
    
    console.log(`Generating reports for period: ${fromISO} to ${toISO}`);

    // Fetch staff list
    let staffQuery = supabase.from('staff').select('id, email, name');
    
    if (staffId) {
      staffQuery = staffQuery.eq('id', staffId);
    }
    
    const { data: staffs, error: staffErr } = await staffQuery;
    if (staffErr) {
      console.error('Error fetching staff:', staffErr);
      return new Response(JSON.stringify({ error: staffErr.message }), { 
        status: 500, 
        headers: { "content-type": "application/json" }
      });
    }

    // Fetch admin emails for CC
    const { data: admins } = await supabase.from('admin').select('email');
    const adminEmails = (admins || []).map(admin => admin.email);

    console.log(`Processing ${staffs?.length || 0} staff members`);

    // Process each staff member
    for (const staff of staffs || []) {
      try {
        const reportData = await generateStaffReport(staff.id, staff.name, staff.email, fromISO, toISO);
        
        if (reportData.teams.length > 0) {
          await sendReportEmail(reportData, adminEmails);
          console.log(`Report sent to ${staff.email}`);
        } else {
          console.log(`No team data for staff ${staff.name}, skipping email`);
        }
      } catch (error) {
        console.error(`Error processing staff ${staff.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        processed: staffs?.length || 0,
        period: { from: fromISO, to: toISO }
      }), 
      { headers: { "content-type": "application/json" }}
    );

  } catch (error) {
    console.error('Error in weekly report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { "content-type": "application/json" }
      }
    );
  }
});

async function generateStaffReport(
  staffId: string, 
  staffName: string, 
  staffEmail: string,
  fromDate: string, 
  toDate: string
): Promise<ReportData> {
  
  // Get staff teams
  const { data: staffTeams, error: teamErr } = await supabase
    .from('staff_team')
    .select(`
      teamid,
      team:teamid (
        teamid,
        name
      )
    `)
    .eq('staffid', staffId)
    .eq('active', true);

  if (teamErr) throw teamErr;

  const teamIds = (staffTeams || []).map(st => st.teamid);
  
  if (teamIds.length === 0) {
    return {
      staffId,
      staffName,
      staffEmail,
      teams: [],
      topAbsentees: [],
      weekStart: fromDate,
      weekEnd: toDate
    };
  }

  // Get occurrences for the period
  const { data: occurrences, error: occErr } = await supabase
    .from('session_occurrence')
    .select('id, teamid')
    .in('teamid', teamIds)
    .gte('starts_at', fromDate)
    .lte('starts_at', toDate);

  if (occErr) throw occErr;

  const teams: AttendanceSummary[] = [];
  const allAbsences: StudentAbsence[] = [];

  // Process each team
  for (const staffTeam of staffTeams || []) {
    const teamOccurrences = (occurrences || []).filter(occ => occ.teamid === staffTeam.teamid);
    
    if (teamOccurrences.length === 0) continue;

    const occurrenceIds = teamOccurrences.map(occ => occ.id);

    // Get attendance for team occurrences
    const { data: attendance, error: attErr } = await supabase
      .from('attendance')
      .select(`
        status,
        studentid,
        student:studentid (
          firstname,
          lastname
        )
      `)
      .in('occurrenceid', occurrenceIds);

    if (attErr) throw attErr;

    // Calculate team summary
    const present = (attendance || []).filter(a => a.status === 'present').length;
    const late = (attendance || []).filter(a => a.status === 'late').length;
    const excused = (attendance || []).filter(a => a.status === 'excused').length;
    const absent = (attendance || []).filter(a => a.status === 'absent').length;
    
    const total = present + late + excused + absent;
    const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

    teams.push({
      teamid: staffTeam.teamid,
      teamname: (staffTeam as any).team?.name || 'Unknown Team',
      total_sessions: teamOccurrences.length,
      present_count: present,
      late_count: late,
      excused_count: excused,
      absent_count: absent,
      attendance_rate: attendanceRate
    });

    // Collect absences for this team
    const teamAbsences = (attendance || [])
      .filter(a => a.status === 'absent')
      .reduce((acc, a) => {
        const key = a.studentid;
        if (!acc[key]) {
          acc[key] = {
            studentid: a.studentid,
            firstname: (a as any).student?.firstname || 'Unknown',
            lastname: (a as any).student?.lastname || 'Student',
            teamname: (staffTeam as any).team?.name || 'Unknown Team',
            absence_count: 0
          };
        }
        acc[key].absence_count++;
        return acc;
      }, {} as Record<string, StudentAbsence>);

    allAbsences.push(...Object.values(teamAbsences));
  }

  // Get top 5 absent students
  const topAbsentees = allAbsences
    .sort((a, b) => b.absence_count - a.absence_count)
    .slice(0, 5);

  return {
    staffId,
    staffName,
    staffEmail,
    teams,
    topAbsentees,
    weekStart: fromDate,
    weekEnd: toDate
  };
}

async function sendReportEmail(reportData: ReportData, adminEmails: string[]) {
  const htmlContent = generateEmailHTML(reportData);
  
  const emailPayload = {
    from: 'noreply@yourapp.com', // Update with your domain
    to: [reportData.staffEmail],
    cc: adminEmails,
    subject: `Weekly Attendance Report - ${formatDateForEmail(reportData.weekStart)} to ${formatDateForEmail(reportData.weekEnd)}`,
    html: htmlContent
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

function generateEmailHTML(data: ReportData): string {
  const teamRows = data.teams.map(team => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${team.teamname}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.total_sessions}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.attendance_rate.toFixed(1)}%</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.present_count}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.late_count}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.excused_count}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${team.absent_count}</td>
    </tr>
  `).join('');

  const absenteeRows = data.topAbsentees.map(student => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${student.firstname} ${student.lastname}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${student.teamname}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${student.absence_count}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Attendance Report</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin-bottom: 10px;">Weekly Attendance Report</h1>
        <p style="color: #666; margin-bottom: 30px;">
          <strong>Coach:</strong> ${data.staffName}<br>
          <strong>Period:</strong> ${formatDateForEmail(data.weekStart)} to ${formatDateForEmail(data.weekEnd)}
        </p>

        <h2 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Team Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Team</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Sessions</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Attendance Rate</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Present</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Late</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Excused</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Absent</th>
            </tr>
          </thead>
          <tbody>
            ${teamRows}
          </tbody>
        </table>

        ${data.topAbsentees.length > 0 ? `
        <h2 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Top Absent Students</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Student</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Team</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Absences</th>
            </tr>
          </thead>
          <tbody>
            ${absenteeRows}
          </tbody>
        </table>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>This report was automatically generated by the Coach Dashboard system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatDateForEmail(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
