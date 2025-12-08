"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Users, 
  Calendar, 
  TrendingUp,
  Download,
  Eye,
  Clock,
  ChevronDown,
  ChevronRight,
  Mail
} from "lucide-react";
import { useAllTeams, useAttendanceReport, useAttendanceStats } from "@/features/admin/hooks";
import { CoachEmailCampaign } from "@/components/marketing/coach-email-campaign";

interface AttendanceRecord {
  id?: string;
  date: string;
  assisted: boolean;
  ispresent?: boolean;
  session?: {
    sessionid: string;
    starttime: string;
    endtime: string;
    team?: {
      name: string;
    };
  };
  student?: {
    studentid: string;
    firstname: string;
    lastname: string;
    name?: string;
    email?: string;
    grade?: string;
  };
}

interface SessionGroup {
  sessionId: string;
  teamName: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: AttendanceRecord[];
  presentCount: number;
  totalCount: number;
}

interface TeamGroup {
  teamName: string;
  sessions: SessionGroup[];
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
}

export function AdminDashboard() {
  const [selectedSession, setSelectedSession] = useState<SessionGroup | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const { teams } = useAllTeams();
  const { attendance, isLoading: attendanceLoading } = useAttendanceReport();
  const { stats, isLoading: statsLoading } = useAttendanceStats();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Función para agrupar asistencia por equipos y luego por sesiones
  const groupAttendanceByTeamsAndSessions = (attendance: AttendanceRecord[]): TeamGroup[] => {
    const teamMap = new Map<string, TeamGroup>();

    attendance.forEach((record) => {
      const teamName = record.session?.team?.name || 'Unknown Team';
      
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, {
          teamName,
          sessions: [],
          totalStudents: 0,
          totalSessions: 0,
          averageAttendance: 0,
        });
      }

      const team = teamMap.get(teamName)!;
      
      // Agrupar por sesión dentro del equipo
      const sessionKey = `${record.session?.sessionid}-${record.date}`;
      let session = team.sessions.find(s => `${s.sessionId}-${s.date}` === sessionKey);
      
      if (!session) {
        session = {
          sessionId: record.session?.sessionid || 'unknown',
          teamName: teamName,
          date: record.date,
          startTime: record.session?.starttime || '',
          endTime: record.session?.endtime || '',
          attendance: [],
          presentCount: 0,
          totalCount: 0,
        };
        team.sessions.push(session);
      }

      session.attendance.push(record);
      session.totalCount++;
      if (record.assisted) {
        session.presentCount++;
      }
    });

    // Calcular estadísticas para cada equipo
    teamMap.forEach((team) => {
      const uniqueStudents = new Set();
      let totalPresent = 0;
      let totalRecords = 0;

      team.sessions.forEach((session) => {
        session.attendance.forEach((record) => {
          uniqueStudents.add(record.student?.studentid);
          totalRecords++;
          if (record.assisted) {
            totalPresent++;
          }
        });
      });

      team.totalStudents = uniqueStudents.size;
      team.totalSessions = team.sessions.length;
      team.averageAttendance = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;
      
      // Ordenar sesiones por fecha
      team.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(teamMap.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
  };

  // Función para exportar PDF de todos los equipos
  const exportToPDF = () => {
    if (!attendance || attendance.length === 0) {
      alert('No data to export');
      return;
    }

    const teamGroups = groupAttendanceByTeamsAndSessions(attendance);
    generatePDF(teamGroups, 'All Teams Attendance Report');
  };

  // Función para exportar PDF de un equipo específico
  const exportTeamToPDF = (team: TeamGroup) => {
    generatePDF([team], `Team Report - ${team.teamName}`);
  };

  // Función para exportar PDF de una sesión específica
  const exportSessionToPDF = (session: SessionGroup) => {
    const teamGroup: TeamGroup = {
      teamName: session.teamName,
      sessions: [session],
      totalStudents: session.attendance.length,
      totalSessions: 1,
      averageAttendance: (session.presentCount / session.totalCount) * 100
    };
    generatePDF([teamGroup], `Session Report - ${session.teamName} - ${formatDate(session.date)}`);
  };

  // Función genérica para generar PDF
  const generatePDF = (teamGroups: TeamGroup[], title: string) => {
    
    // Crear contenido HTML para el PDF
    let htmlContent = `
      <html>
        <head>
          <title>Reporte de Asistencia - Admin Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .session { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
            .session-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 15px; }
            .student-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
            .status-present { color: green; font-weight: bold; }
            .status-absent { color: red; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
    `;

    teamGroups.forEach((team) => {
      htmlContent += `
        <div class="session">
          <div class="session-header">
            <h2>${team.teamName}</h2>
            <p><strong>Unique students:</strong> ${team.totalStudents} | 
               <strong>Sessions:</strong> ${team.totalSessions} | 
               <strong>Average attendance:</strong> ${team.averageAttendance.toFixed(1)}%</p>
          </div>
      `;

      team.sessions.forEach((session) => {
        htmlContent += `
          <div style="margin-left: 20px; margin-bottom: 15px; border-left: 3px solid #ddd; padding-left: 15px;">
            <h4>${formatDate(session.date)} - ${formatTime(session.startTime)} to ${formatTime(session.endTime)}</h4>
            <p><strong>Attendance:</strong> ${session.presentCount}/${session.totalCount} (${((session.presentCount/session.totalCount)*100).toFixed(1)}%)</p>
        `;

        session.attendance.forEach((record) => {
          htmlContent += `
            <div class="student-row" style="margin-left: 10px;">
              <span>${record.student?.firstname} ${record.student?.lastname}</span>
              <span class="${record.assisted ? 'status-present' : 'status-absent'}">
                ${record.assisted ? 'Present' : 'Absent'}
              </span>
            </div>
          `;
        });

        htmlContent += `</div>`;
      });

      htmlContent += `</div>`;
    });

    htmlContent += `
          <div class="summary">
            <h3>General Summary</h3>
            <p><strong>Total teams:</strong> ${teamGroups.length}</p>
            <p><strong>Total sessions:</strong> ${teamGroups.reduce((acc, team) => acc + team.totalSessions, 0)}</p>
            <p><strong>Total unique students:</strong> ${teamGroups.reduce((acc, team) => acc + team.totalStudents, 0)}</p>
            <p><strong>Overall average attendance:</strong> ${teamGroups.length > 0 ? (teamGroups.reduce((acc, team) => acc + team.averageAttendance, 0) / teamGroups.length).toFixed(1) : 0}%</p>
          </div>
        </body>
      </html>
    `;

    // Crear ventana nueva para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const toggleTeamExpansion = (teamName: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const toggleSessionExpansion = (sessionKey: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionKey)) {
      newExpanded.delete(sessionKey);
    } else {
      newExpanded.add(sessionKey);
    }
    setExpandedSessions(newExpanded);
  };

  const openSessionModal = (session: SessionGroup) => {
    setSelectedSession(session);
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // HH:MM format
  };

  const getAttendanceColor = (assisted: boolean) => {
    return assisted ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage attendance and email campaigns
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="email-campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Campaigns
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Attendance Monitoring
              </h2>
              <p className="text-gray-600">
                View attendance across all teams and sessions
              </p>
            </div>
            <Button 
              onClick={exportToPDF}
              disabled={attendanceLoading || attendance.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats.totalSessions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Students
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : stats.totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Average Attendance
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? "..." : `${stats.averageAttendance.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Teams
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {teams.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Teams and Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance by Teams and Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attendance records found
            </div>
          ) : (
            <div className="space-y-6">
              {groupAttendanceByTeamsAndSessions(attendance).map((team) => {
                const isTeamExpanded = expandedTeams.has(team.teamName);
                
                return (
                  <Card key={team.teamName} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleTeamExpansion(team.teamName)}
                      >
                        <div className="flex items-center gap-3">
                          {isTeamExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <div>
                            <h2 className="text-xl font-bold">{team.teamName}</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {team.totalStudents} unique students
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {team.totalSessions} sessions
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                {team.averageAttendance.toFixed(1)}% average
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={team.averageAttendance > 80 ? "default" : "secondary"}
                            className="text-lg px-3 py-1"
                          >
                            {team.averageAttendance.toFixed(1)}%
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTeamToPDF(team);
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Export Team
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {isTeamExpanded && (
                      <CardContent className="pt-0 space-y-4">
                        {team.sessions.map((session) => {
                          const sessionKey = `${session.sessionId}-${session.date}`;
                          const isSessionExpanded = expandedSessions.has(sessionKey);
                          
                          return (
                            <Card key={sessionKey} className="border-l-4 border-l-blue-500 ml-4">
                              <CardHeader className="pb-3">
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => toggleSessionExpansion(sessionKey)}
                                >
                                  <div className="flex items-center gap-3">
                                    {isSessionExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                    <div>
                                      <h3 className="text-lg font-semibold">
                                        {formatDate(session.date)}
                                      </h3>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Users className="h-4 w-4" />
                                          {session.presentCount}/{session.totalCount} present
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={session.presentCount/session.totalCount > 0.8 ? "default" : "secondary"}
                                    >
                                      {((session.presentCount/session.totalCount)*100).toFixed(1)}%
                                    </Badge>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        exportSessionToPDF(session);
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Export Session
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openSessionModal(session);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              {isSessionExpanded && (
                                <CardContent className="pt-0">
                                  <div className="space-y-2">
                                    {session.attendance.map((record, recordIndex) => (
                                      <div 
                                        key={`${record.id}-${recordIndex}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">
                                            {record.student?.firstname} {record.student?.lastname}
                                          </span>
                                          {record.student?.grade && (
                                            <span className="text-sm text-gray-500">
                                              (Grade {record.student.grade})
                                            </span>
                                          )}
                                        </div>
                                        <Badge className={getAttendanceColor(record.assisted)}>
                                          {record.assisted ? "Present" : "Absent"}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para detalles de sesión */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{selectedSession.teamName}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedSession.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {selectedSession.presentCount}/{selectedSession.totalCount} present
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              <div className="p-6 space-y-3">
                {selectedSession.attendance.map((record, index) => (
                  <div 
                    key={`${record.id}-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {record.student?.firstname?.[0]}{record.student?.lastname?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {record.student?.firstname} {record.student?.lastname}
                        </p>
                        {record.student?.grade && (
                          <p className="text-sm text-gray-500">Grade {record.student.grade}</p>
                        )}
                      </div>
                    </div>
                    <Badge 
                      className={`px-3 py-1 ${record.assisted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {record.assisted ? "Present" : "Absent"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="border-t p-4 bg-gray-50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">
                  Total students: {selectedSession.totalCount}
                </span>
                <span className="font-medium">
                  Attendance rate: {((selectedSession.presentCount/selectedSession.totalCount)*100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
        </TabsContent>

        {/* Email Campaigns Tab */}
        <TabsContent value="email-campaigns" className="mt-6">
          <CoachEmailCampaign />
        </TabsContent>
      </Tabs>
    </div>
  );
}
