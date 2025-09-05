"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Calendar, Trophy, Clock } from "lucide-react"

interface Team {
  id: number
  name: string
  category: string
  players: number
  nextGame: string
}

interface TeamOverviewProps {
  teams: Team[]
}

export function TeamOverview({ teams }: TeamOverviewProps) {
  // Mock player data
  const mockPlayers = [
    { id: 1, name: "John Smith", position: "Forward", attendance: 95 },
    { id: 2, name: "Maria Garcia", position: "Midfielder", attendance: 88 },
    { id: 3, name: "Carlos Lopez", position: "Defender", attendance: 92 },
    { id: 4, name: "Ana Martinez", position: "Goalkeeper", attendance: 100 },
    { id: 5, name: "Diego Rodriguez", position: "Forward", attendance: 85 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">My Teams</h2>
        <p className="text-muted-foreground">Manage and supervise all your assigned teams</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>{team.category}</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{team.players} players</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Next Game</p>
                    <p className="text-xs text-muted-foreground">{team.nextGame}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Season</p>
                    <p className="text-xs text-muted-foreground">2024-2025</p>
                  </div>
                </div>
              </div>

              {/* Recent Players */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">Featured Players</h4>
                <div className="space-y-2">
                  {mockPlayers.slice(0, 3).map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={`/generic-athlete.png?height=32&width=32&query=player ${player.name}`}
                          />
                          <AvatarFallback>
                            {player.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        </div>
                      </div>
                      <Badge variant={player.attendance >= 90 ? "default" : "secondary"}>{player.attendance}%</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Ver Jugadores
                </Button>
                <Button variant="outline" size="sm">
                  <Clock className="mr-2 h-4 w-4" />
                  Marcar Asistencia
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
