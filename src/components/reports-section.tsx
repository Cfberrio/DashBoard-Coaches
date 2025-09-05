"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Calendar, TrendingUp, Users, Clock } from "lucide-react"

export function ReportsSection() {
  const reportTypes = [
    {
      id: 1,
      title: "Monthly Attendance Report",
      description: "Complete attendance summary by team and player",
      icon: <Calendar className="h-5 w-5" />,
      lastGenerated: "2025-01-20",
      status: "available",
    },
    {
      id: 2,
      title: "Performance Analysis",
      description: "Player performance and progress statistics",
      icon: <TrendingUp className="h-5 w-5" />,
      lastGenerated: "2025-01-18",
      status: "available",
    },
    {
      id: 3,
      title: "Team Report",
      description: "General information and statistics by team",
      icon: <Users className="h-5 w-5" />,
      lastGenerated: "2025-01-15",
      status: "available",
    },
    {
      id: 4,
      title: "Training History",
      description: "Detailed record of training sessions",
      icon: <Clock className="h-5 w-5" />,
      lastGenerated: null,
      status: "pending",
    },
  ]

  const quickStats = [
    { label: "Average Attendance", value: "87%", trend: "+5%" },
    { label: "Active Players", value: "40", trend: "+2" },
    { label: "Trainings/Week", value: "6", trend: "0" },
    { label: "Managed Teams", value: "2", trend: "0" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Reports and Statistics</h2>
        <p className="text-muted-foreground">Generate and download detailed reports of your teams</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <Badge variant={stat.trend.startsWith("+") ? "default" : "secondary"}>{stat.trend}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Reportes Disponibles
          </CardTitle>
          <CardDescription>Genera y descarga reportes personalizados para tus equipos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => (
              <div key={report.id} className="p-4 border border-border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">{report.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{report.title}</h3>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    {report.lastGenerated && (
                      <p className="text-xs text-muted-foreground mt-1">Last: {report.lastGenerated}</p>
                    )}
                  </div>
                  <Badge variant={report.status === "available" ? "default" : "secondary"}>
                    {report.status === "available" ? "Available" : "Pending"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={report.status !== "available"}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled={report.status !== "available"}>
                    Ver Online
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate New Report */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Nuevo Reporte</CardTitle>
          <CardDescription>Crea reportes personalizados con filtros específicos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Tipo de Reporte</label>
                <select className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground">
                  <option>Asistencia</option>
                  <option>Rendimiento</option>
                  <option>Equipos</option>
                  <option>Personalizado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Equipo</label>
                <select className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground">
                  <option>Todos los equipos</option>
                  <option>Juvenil A</option>
                  <option>Infantil B</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Período</label>
                <select className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground">
                  <option>Último mes</option>
                  <option>Últimos 3 meses</option>
                  <option>Temporada actual</option>
                  <option>Personalizado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generar Reporte
              </Button>
              <Button variant="outline">Vista Previa</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
