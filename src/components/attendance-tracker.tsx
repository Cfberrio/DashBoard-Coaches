"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Clock, Users } from "lucide-react"

export function AttendanceTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

  // Mock attendance data
  const attendanceData = [
    { id: 1, name: "Juan Pérez", team: "Juvenil A", status: "present", time: "16:00" },
    { id: 2, name: "María García", team: "Juvenil A", status: "present", time: "16:05" },
    { id: 3, name: "Carlos López", team: "Juvenil A", status: "late", time: "16:15" },
    { id: 4, name: "Ana Martínez", team: "Juvenil A", status: "absent", time: null },
    { id: 5, name: "Diego Rodríguez", team: "Infantil B", status: "present", time: "17:00" },
    { id: 6, name: "Sofia Hernández", team: "Infantil B", status: "present", time: "17:02" },
    { id: 7, name: "Miguel Torres", team: "Infantil B", status: "late", time: "17:20" },
  ]


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Presente</Badge>
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Tardío</Badge>
      case "absent":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Ausente</Badge>
      default:
        return null
    }
  }

  const toggleAttendance = (playerId: number) => {
    // This would update the attendance status in a real application
    console.log(`Toggling attendance for player ${playerId}`)
  }

  const juvenilAPlayers = attendanceData.filter((player) => player.team === "Juvenil A")
  const infantilBPlayers = attendanceData.filter((player) => player.team === "Infantil B")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Attendance Control</h2>
          <p className="text-muted-foreground">Registra y supervisa la asistencia de tus jugadores</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Presentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {attendanceData.filter((p) => p.status === "present").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Tardíos</p>
                <p className="text-2xl font-bold text-foreground">
                  {attendanceData.filter((p) => p.status === "late").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Ausentes</p>
                <p className="text-2xl font-bold text-foreground">
                  {attendanceData.filter((p) => p.status === "absent").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{attendanceData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance by Team */}
      <Tabs defaultValue="juvenil-a" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="juvenil-a">Juvenil A</TabsTrigger>
          <TabsTrigger value="infantil-b">Infantil B</TabsTrigger>
        </TabsList>

        <TabsContent value="juvenil-a" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Youth A - Attendance List
              </CardTitle>
              <CardDescription>
                {juvenilAPlayers.filter((p) => p.status === "present").length} de {juvenilAPlayers.length} jugadores
                presentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {juvenilAPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={`/generic-athlete.png?height=40&width=40&query=player ${player.name}`}
                        />
                        <AvatarFallback>
                          {player.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.time ? `Arrival: ${player.time}` : "No record"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(player.status)}
                      <Button size="sm" variant="outline" onClick={() => toggleAttendance(player.id)}>
                        Cambiar Estado
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infantil-b" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kids B - Attendance List
              </CardTitle>
              <CardDescription>
                {infantilBPlayers.filter((p) => p.status === "present").length} de {infantilBPlayers.length} jugadores
                presentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {infantilBPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={`/generic-athlete.png?height=40&width=40&query=player ${player.name}`}
                        />
                        <AvatarFallback>
                          {player.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.time ? `Arrival: ${player.time}` : "No record"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(player.status)}
                      <Button size="sm" variant="outline" onClick={() => toggleAttendance(player.id)}>
                        Cambiar Estado
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
