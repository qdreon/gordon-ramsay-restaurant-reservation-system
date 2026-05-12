"use client"

import * as React from "react"
import { Users, Clock, UtensilsCrossed, CircleDot } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

type TableStatus = "available" | "reserved" | "occupied" | "dirty"

interface TableData {
  id: string
  capacity: number
  col: number
  row: number
  status: TableStatus
  guestName?: string
  guestCount?: number
}

interface Reservation {
  id: string
  name: string
  time: string
  tableId: string
  pax: number
}

const initialTables: TableData[] = [
  // Front Row (Row 0)
  { id: "T1", capacity: 2, col: 0, row: 0, status: "available" },
  { id: "T2", capacity: 2, col: 1, row: 0, status: "reserved", guestName: "Martinez" },
  { id: "T3", capacity: 4, col: 2, row: 0, status: "available" },
  { id: "T4", capacity: 4, col: 3, row: 0, status: "occupied", guestName: "Chen", guestCount: 3 },
  { id: "T5", capacity: 4, col: 4, row: 0, status: "dirty" },
  // Middle Row (Row 1)
  { id: "T6", capacity: 2, col: 0, row: 1, status: "occupied", guestName: "Smith", guestCount: 2 },
  { id: "T7", capacity: 2, col: 1, row: 1, status: "available" },
  { id: "T8", capacity: 4, col: 2, row: 1, status: "reserved", guestName: "Johnson" },
  { id: "T9", capacity: 4, col: 3, row: 1, status: "available" },
  { id: "T10", capacity: 4, col: 4, row: 1, status: "occupied", guestName: "Williams", guestCount: 4 },
  // Back Row (Row 2)
  { id: "T11", capacity: 6, col: 0, row: 2, status: "available" },
  { id: "T12", capacity: 6, col: 1, row: 2, status: "reserved", guestName: "Davis" },
  { id: "T13", capacity: 6, col: 2, row: 2, status: "occupied", guestName: "Brown", guestCount: 5 },
  { id: "T14", capacity: 8, col: 3, row: 2, status: "available" },
  { id: "T15", capacity: 8, col: 4, row: 2, status: "dirty" },
]

const initialReservations: Reservation[] = [
  { id: "R1", name: "Martinez", time: "18:30", tableId: "T2", pax: 2 },
  { id: "R2", name: "Johnson", time: "19:00", tableId: "T8", pax: 4 },
  { id: "R3", name: "Davis", time: "19:30", tableId: "T12", pax: 6 },
  { id: "R4", name: "Anderson", time: "20:00", tableId: "T14", pax: 7 },
  { id: "R5", name: "Taylor", time: "20:30", tableId: "T3", pax: 3 },
]

const statusColors: Record<TableStatus, string> = {
  available: "bg-emerald-500",
  reserved: "bg-amber-500",
  occupied: "bg-red-500",
  dirty: "bg-slate-500",
}

const statusLabels: Record<TableStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  dirty: "Dirty",
}

function TableComponent({
  table,
  onStatusChange,
}: {
  table: TableData
  onStatusChange: (id: string, status: TableStatus) => void
}) {
  const isCircular = table.capacity <= 4
  const baseSize = isCircular ? "w-16 h-16" : "w-24 h-14"
  const shape = isCircular ? "rounded-full" : "rounded-sm"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`${baseSize} ${shape} ${statusColors[table.status]} flex flex-col items-center justify-center transition-all hover:scale-105 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyber focus:ring-offset-2 focus:ring-offset-background`}
          style={{ fontFamily: "Arial", fontSize: "11px" }}
        >
          <span className="font-bold text-white">{table.id}</span>
          <span className="text-white/80">{table.capacity}p</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[140px]">
        {(Object.keys(statusColors) as TableStatus[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => onStatusChange(table.id, status)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
            <span>{statusLabels[status]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-sm border border-border">
      {(Object.keys(statusColors) as TableStatus[]).map((status) => (
        <div key={status} className="flex items-center gap-2" style={{ fontFamily: "Arial", fontSize: "11px" }}>
          <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
          <span className="text-muted-foreground">{statusLabels[status]}</span>
        </div>
      ))}
    </div>
  )
}

function OnlineIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 backdrop-blur-sm rounded-sm border border-border">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
      <span className="text-emerald-400" style={{ fontFamily: "Arial", fontSize: "11px" }}>
        Online
      </span>
    </div>
  )
}

export function FloorPlanManager() {
  const [tables, setTables] = React.useState<TableData[]>(initialTables)
  const [reservations] = React.useState<Reservation[]>(initialReservations)
  const [walkInName, setWalkInName] = React.useState("")
  const [walkInPax, setWalkInPax] = React.useState("")
  const [walkInTable, setWalkInTable] = React.useState("")

  const handleStatusChange = (id: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...table, status } : table))
    )
  }

  const handleWalkIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!walkInName || !walkInPax || !walkInTable) return

    setTables((prev) =>
      prev.map((table) =>
        table.id === walkInTable
          ? {
              ...table,
              status: "occupied" as TableStatus,
              guestName: walkInName,
              guestCount: parseInt(walkInPax),
            }
          : table
      )
    )
    setWalkInName("")
    setWalkInPax("")
    setWalkInTable("")
  }

  const occupiedTables = tables.filter((t) => t.status === "occupied")

  // Organize tables by row for the grid
  const rows = [0, 1, 2].map((rowIndex) =>
    tables.filter((t) => t.row === rowIndex).sort((a, b) => a.col - b.col)
  )

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left Sidebar */}
       <aside className="w-80 flex-shrink-0 border-r border-border bg-sidebar flex flex-col h-screen overflow-hidden">
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <h1
            className="text-lg font-semibold text-sidebar-foreground flex items-center gap-2"
            style={{ fontFamily: "Arial" }}
          >
            <UtensilsCrossed className="w-5 h-5 text-cyber" />
            Logistics
          </h1>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 space-y-6 pb-8">
            {/* Upcoming Reservations */}
            <section>
              <h2
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                <Clock className="w-4 h-4" />
                Upcoming Reservations
              </h2>
              <div className="space-y-2">
                {reservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 bg-sidebar-accent rounded-sm border border-sidebar-border"
                    style={{ fontFamily: "Arial", fontSize: "11px" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sidebar-foreground">{res.name}</span>
                      <span className="text-cyber font-mono">{res.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-muted-foreground">
                      <span>{res.tableId}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {res.pax}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Walk-In Form */}
            <section>
              <h2
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                <CircleDot className="w-4 h-4" />
                Walk-In
              </h2>
              <form onSubmit={handleWalkIn} className="space-y-3">
                <Input
                  placeholder="Guest Name"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                />
                <Input
                  type="number"
                  placeholder="Pax"
                  value={walkInPax}
                  onChange={(e) => setWalkInPax(e.target.value)}
                  min="1"
                  max="10"
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                />
                <Input
                  placeholder="Table Number (e.g., T1)"
                  value={walkInTable}
                  onChange={(e) => setWalkInTable(e.target.value.toUpperCase())}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                />
                <Button
                  type="submit"
                  className="w-full bg-cyber text-background hover:bg-cyber/90"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                >
                  Seat Walk-In
                </Button>
              </form>
            </section>

            {/* Occupied Tables */}
            <section>
              <h2
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                <Users className="w-4 h-4" />
                Occupied Tables
              </h2>
              <div className="space-y-2">
                {occupiedTables.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4" style={{ fontFamily: "Arial", fontSize: "11px" }}>
                    No occupied tables
                  </p>
                ) : (
                  occupiedTables.map((table) => (
                    <div
                      key={table.id}
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm"
                      style={{ fontFamily: "Arial", fontSize: "11px" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sidebar-foreground">{table.guestName}</span>
                        <span className="text-red-400 font-mono">{table.id}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-muted-foreground">
                        <span>Capacity: {table.capacity}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {table.guestCount || "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Floor Plan */}
      <main className="flex-1 flex flex-col">
        {/* Header with Legend */}
        <header className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "Arial" }}>
            Interactive Floor Plan
          </h2>
          <Legend />
        </header>

        {/* Floor Plan Grid */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="space-y-8">
            {/* Row Labels */}
            <div className="flex items-center gap-4">
              <span
                className="w-16 text-center text-muted-foreground"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                Front
              </span>
              <div className="flex items-center gap-6">
                {rows[0].map((table) => (
                  <TableComponent
                    key={table.id}
                    table={table}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span
                className="w-16 text-center text-muted-foreground"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                Middle
              </span>
              <div className="flex items-center gap-6">
                {rows[1].map((table) => (
                  <TableComponent
                    key={table.id}
                    table={table}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span
                className="w-16 text-center text-muted-foreground"
                style={{ fontFamily: "Arial", fontSize: "11px" }}
              >
                Back
              </span>
              <div className="flex items-center gap-6">
                {rows[2].map((table) => (
                  <TableComponent
                    key={table.id}
                    table={table}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Online Indicator */}
          <div className="absolute bottom-4 right-4">
            <OnlineIndicator />
          </div>
        </div>
      </main>
    </div>
  )
}
