"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  CheckCircle,
  Calendar,
  Search,
} from "lucide-react";
import {
  useDashboard,
  useOccurrenceAttendance,
  AttendanceStatusBadge,
} from "@/features/coach/wiring";

interface Student {
  studentid: string;
  firstname: string;
  lastname: string;
  grade?: string;
  assisted?: boolean;
  assistanceId?: string;
}


export function CoachDashboard() {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);

  const [selectedOccurrence, setSelectedOccurrence] = useState<string>("");

  // Evitar problemas de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Usar nuestros hooks para obtener datos reales
  const { staff, teams, occurrences, isLoading, error } = useDashboard();

  // Inicializar team seleccionado cuando cargan los datos
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].teamid);
    }
  }, [teams, selectedTeam]);

  // No auto-seleccionar ocurrencia, el usuario debe elegir

  // Memoizar teams para evitar regeneración en cada render
  const stableTeams = useMemo(() => teams || [], [teams]);

  // Memoizar filteredTeams basado en searchTerm y stableTeams
  const filteredTeamsMemo = useMemo(() => {
    if (!stableTeams.length) return [];

    return stableTeams.filter((team) =>
      team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, stableTeams]);

  const currentTeam = teams?.find((team) => team.teamid === selectedTeam);
  const currentOccurrence = occurrences?.find(
    (occ) => occ.id === selectedOccurrence
  );

  // Filtrar ocurrencias por equipo seleccionado
  const teamOccurrences =
    occurrences?.filter((occ) => occ.teamid === selectedTeam) || [];

  // Obtener datos de asistencia si estamos en modo check-in
  const attendanceData = useOccurrenceAttendance(
    attendanceMode ? selectedOccurrence : "",
    currentOccurrence?.teamid
  );
  const presentCount =
    attendanceData.students?.filter((s) => s.assistance?.assisted).length || 0;
  const totalCount = attendanceData.students?.length || 0;

  const toggleAttendance = async (studentId: string, assisted?: boolean) => {
    if (!selectedOccurrence || !attendanceData.setAttendance) return;

    const student = attendanceData.students?.find(
      (s) => s.studentid === studentId
    );
    if (!student) return;

    // Si no se especifica nuevo estado, alternar entre presente/ausente
    const currentAssisted = student.assistance?.assisted || false;
    const newAssisted = assisted !== undefined ? assisted : !currentAssisted;

    try {
      await attendanceData.setAttendance(studentId, newAssisted);
      console.log(
        `Attendance updated for student ${studentId}: ${
          newAssisted ? "present" : "absent"
        }`
      );
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const startAttendanceSession = () => {
    if (!selectedOccurrence) {
      console.error("No occurrence selected for attendance");
      return;
    }
    setAttendanceMode(true);
    console.log(
      `Starting attendance session for occurrence ${selectedOccurrence}`
    );
  };

  // No renderizar nada hasta que el componente esté montado en el cliente
  if (!mounted) {
    return null;
  }

  // Mostrar estado de carga o error
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            Error al cargar dashboard
          </h2>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Acceso requerido</h2>
          <p className="text-sm text-gray-600">
            Debes iniciar sesión para acceder al dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Coach Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Welcome, {staff.name} • {teams?.length || 0} assigned teams
        </p>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            My Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search in my teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm sm:text-base"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
              {filteredTeamsMemo.map((team) => (
                <Button
                  key={team.teamid}
                  variant={selectedTeam === team.teamid ? "default" : "outline"}
                  onClick={() => setSelectedTeam(team.teamid)}
                  className="h-auto p-3 sm:p-4 flex flex-col items-start text-left min-h-[80px] sm:min-h-[90px]"
                >
                  <span className="font-medium text-sm sm:text-base">
                    {team.name}
                  </span>
                  {team.school && (
                    <span className="text-xs opacity-70">
                      {team.school.location}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {filteredTeamsMemo.length === 0 && searchTerm && (
              <p className="text-xs sm:text-sm text-gray-500 text-center py-4">
                No se encontraron equipos que coincidan con "{searchTerm}"
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {currentTeam && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Select Session - {currentTeam.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamOccurrences.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay sesiones programadas para este equipo
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  Select the session for which you want to take attendance:
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                  {teamOccurrences.map((occurrence) => (
                    <Button
                      key={occurrence.id}
                      variant={
                        selectedOccurrence === occurrence.id
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSelectedOccurrence(occurrence.id)}
                      className="h-auto p-3 flex flex-col items-start text-left"
                    >
                      <div className="font-medium text-sm">
                        {new Date(occurrence.starts_at).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                      <div className="text-xs opacity-70">
                        {new Date(occurrence.starts_at).toLocaleTimeString(
                          "es-ES",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}{" "}
                        {occurrence.location && `- ${occurrence.location}`}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentOccurrence && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-3 sm:pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium text-sm sm:text-base">
                  Selected Session
                </span>
                <Badge variant="outline" className="text-xs">
                  {currentOccurrence.status}
                </Badge>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                <div className="font-medium">
                  {new Date(currentOccurrence.starts_at).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </div>
                <div className="text-xs">
                  {new Date(currentOccurrence.starts_at).toLocaleTimeString(
                    "es-ES",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}{" "}
                  {currentOccurrence.location &&
                    `- ${currentOccurrence.location}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">
              {currentTeam?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
              <div>
                <span className="text-gray-600">Total:</span>
                <span className="ml-1 font-medium">{totalCount}</span>
              </div>
              <div>
                <span className="text-green-600">Present:</span>
                <span className="ml-1 font-medium">{presentCount}</span>
              </div>
              <div>
                <span className="text-red-600">Absent:</span>
                <span className="ml-1 font-medium">{totalCount - presentCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg">Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full h-10 sm:h-9 text-sm sm:text-base"
              onClick={() =>
                attendanceMode
                  ? setAttendanceMode(false)
                  : startAttendanceSession()
              }
              disabled={!currentOccurrence}
            >
              {attendanceMode ? "Finish" : "Start Check-in"}
            </Button>
          </CardContent>
        </Card>

      </div>


      {attendanceMode && currentTeam && attendanceData.students && (
        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                Attendance List - {currentTeam.name}
              </div>
              <Badge
                variant="outline"
                className="text-xs self-start sm:self-center"
              >
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceData.isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">
                  Cargando lista de estudiantes...
                </p>
              </div>
            ) : attendanceData.error ? (
              <div className="text-center py-4 text-red-600">
                <p className="text-sm">
                  Error al cargar la asistencia: {attendanceData.error.message}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2 sm:space-y-3">
                  {attendanceData.students.map((student) => (
                    <div
                      key={student.studentid}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-3 sm:gap-2"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-sm sm:text-base">
                          {student.firstname} {student.lastname}
                        </span>
                        {student.grade && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Grade: {student.grade}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {student.assistance ? (
                          <AttendanceStatusBadge
                            assisted={student.assistance.assisted}
                          />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Not marked
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={
                              student.assistance?.assisted
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              toggleAttendance(student.studentid, true)
                            }
                            disabled={attendanceData.isSettingAttendance}
                            className="h-8 text-xs px-2"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              student.assistance?.assisted === false
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              toggleAttendance(student.studentid, false)
                            }
                            disabled={attendanceData.isSettingAttendance}
                            className="h-8 text-xs px-2"
                          >
                            Absent
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm font-medium">
                    <strong>Session Summary:</strong> {presentCount} of{" "}
                    {totalCount} students present
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Changes are saved automatically in the system
                  </p>
                  {attendanceData.isSettingAttendance && (
                    <p className="text-xs text-blue-600 mt-1">
                      Saving changes...
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
