"use client"

"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users, Lock, Trash2, Activity, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { validateReservationTime, validateOperatingHours, OPERATING_HOURS } from "@/lib/config"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// --- Types & Interfaces Aligned with Schema ---
type ReservationStatus = "pending_payment" | "confirmed" | "seated" | "cancelled" | "completed"

interface Reservation {
  id: string               // UUID PK
  customer_id: string      // UUID FK
  reservation_date: string // DATE
  start_time: string       // TIMESTAMPTZ
  end_time: string         // TIMESTAMPTZ
  party_size: number       // INTEGER (CHECK > 0 AND <= 12)
  status: ReservationStatus // reservation_status
  deposit_amount: number   // DECIMAL(10,2)
  special_requests?: string // TEXT nullable
  isVip: boolean           // UI-specific logic
  tableId: string          // UI-specific logic
}

// --- Constants Aligned with Schema Lifecycle ---
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const sampleReservations: Reservation[] = [
  { id: "R1", customer_id: "Martinez", start_time: "18:30", party_size: 2, tableId: "T2", status: "confirmed", isVip: false, reservation_date: "2026-05-12", end_time: "20:30", deposit_amount: 0 },
  { id: "R2", customer_id: "Johnson VIP", start_time: "19:00", party_size: 4, tableId: "T8", status: "confirmed", isVip: true, reservation_date: "2026-05-12", end_time: "21:00", deposit_amount: 50 },
  { id: "R3", customer_id: "Davis", start_time: "19:30", party_size: 6, tableId: "T12", status: "seated", isVip: false, reservation_date: "2026-05-12", end_time: "21:30", deposit_amount: 0 },
  { id: "R4", customer_id: "Anderson", start_time: "20:00", party_size: 7, tableId: "T14", status: "confirmed", isVip: false, reservation_date: "2026-05-12", end_time: "22:00", deposit_amount: 0 },
  { id: "R5", customer_id: "Taylor VIP", start_time: "20:30", party_size: 8, tableId: "T15", status: "confirmed", isVip: true, reservation_date: "2026-05-12", end_time: "22:30", deposit_amount: 100 },
]

const statusColors: Record<ReservationStatus, string> = {
  pending_payment: "bg-amber-500",
  confirmed: "bg-emerald-500",
  seated: "bg-cyan-500",
  cancelled: "bg-red-500",
  completed: "bg-slate-500",
}

// --- Helper Functions ---
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function formatTime12h(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// --- Components ---
function SystemLiveIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 backdrop-blur-sm rounded-sm border border-border">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-emerald-400 font-sans text-[11px]">
        System Live (DB-3)
      </span>
    </div>
  )
}

function MasterCalendar() {
  const today = new Date()
  const [currentDate, setCurrentDate] = React.useState(today)
  const [selectedDate, setSelectedDate] = React.useState(today)
  const [reservations, setReservations] = React.useState<Reservation[]>([])
  const [blockedDates, setBlockedDates] = React.useState<string[]>([])
  const [filterVip, setFilterVip] = React.useState(false)
  const [filterLargeGroup, setFilterLargeGroup] = React.useState(false)
  const [filterStatus, setFilterStatus] = React.useState<ReservationStatus | "all">("all")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isBlockDateModalOpen, setIsBlockDateModalOpen] = React.useState(false)
  const [blockDateReason, setBlockDateReason] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [operatingHours, setOperatingHours] = React.useState<{ opening: number; closing: number }>({
    opening: OPERATING_HOURS.OPENING_HOUR,
    closing: OPERATING_HOURS.CLOSING_HOUR,
  })
  const [isOperatingHoursModalOpen, setIsOperatingHoursModalOpen] = React.useState(false)
  const [operatingHoursError, setOperatingHoursError] = React.useState<string | null>(null)
  const [newReservation, setNewReservation] = React.useState({
    customer_id: "",
    start_time: "19:00",
    party_size: "2",
    tableId: "",
    isVip: false,
  })
  const [reservationValidationError, setReservationValidationError] = React.useState<string | null>(null)

  // Load reservations for current month
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth()
        const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
        const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-31`

        const response = await fetch(`/api/admin/reservations/range?startDate=${startDate}&endDate=${endDate}`)
        const payload = await response.json()

        if (!response.ok || !payload.reservations) {
          throw new Error(payload.error ?? 'Failed to load calendar data')
        }

        setReservations(payload.reservations.map((res: any) => ({
          id: res.id,
          customer_id: res.customer_id,
          start_time: res.start_time,
          end_time: res.end_time,
          party_size: res.party_size,
          tableId: "T1", // Mock; would come from reservation_tables junction
          status: res.status as ReservationStatus,
          isVip: false, // Would check customers.vip_status
          reservation_date: res.reservation_date,
          deposit_amount: 0,
        })))

        setBlockedDates(payload.blockedDates ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load calendar data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentDate])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth)

  const selectedDateKey = formatDateKey(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  )

  // Get reservations for selected date with filters
  const filteredReservations = reservations.filter((res) => {
    if (res.reservation_date !== selectedDateKey) return false
    if (filterVip && !res.isVip) return false
    if (filterLargeGroup && res.party_size < 6) return false
    if (filterStatus !== "all" && res.status !== filterStatus) return false
    return true
  })

  // Get reservation counts by date for calendar pips
  const reservationsByDate = React.useMemo(() => {
    const map: Record<string, { confirmed: number; seated: number; pending_payment: number; cancelled: number; completed: number }> = {}
    reservations.forEach((res) => {
      if (!map[res.reservation_date]) {
        map[res.reservation_date] = { confirmed: 0, seated: 0, pending_payment: 0, cancelled: 0, completed: 0 }
      }
      map[res.reservation_date][res.status]++
    })
    return map
  }, [reservations])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleAddReservation = (e: React.FormEvent) => {
    e.preventDefault()
    setReservationValidationError(null)
    
    if (!newReservation.customer_id || !newReservation.tableId) {
      setReservationValidationError("Please fill in all required fields")
      return
    }

    // Validate reservation time is within operating hours (FR-8 / QDR-74)
    const [hour] = newReservation.start_time.split(":").map(Number)
    const timeValidation = validateReservationTime(hour, 2) // Default 2-hour duration
    if (!timeValidation.valid) {
      setReservationValidationError(timeValidation.error || "Invalid reservation time")
      return
    }

    const newRes: Reservation = {
      id: `R${Date.now()}`,
      customer_id: newReservation.customer_id + (newReservation.isVip ? " VIP" : ""),
      start_time: newReservation.start_time,
      end_time: "21:00", // Default duration
      party_size: parseInt(newReservation.party_size),
      tableId: newReservation.tableId.toUpperCase(),
      status: "confirmed",
      isVip: newReservation.isVip,
      reservation_date: selectedDateKey,
      deposit_amount: 0,
    }

    setReservations((prev) => [...prev, newRes])
    setNewReservation({
      customer_id: "",
      start_time: "19:00",
      party_size: "2",
      tableId: "",
      isVip: false,
    })
    setIsModalOpen(false)
  }

  const handleOperatingHours = (e: React.FormEvent) => {
    e.preventDefault()
    setOperatingHoursError(null)

    const validation = validateOperatingHours(operatingHours.opening, operatingHours.closing)
    if (!validation.valid) {
      setOperatingHoursError(validation.error || "Invalid operating hours")
      return
    }

    // Success - hours validated and saved
    setIsOperatingHoursModalOpen(false)
  }

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockDateReason.trim()) return

    try {
      const selectedDateStr = formatDateKey(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      )

      const response = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blockedDate: selectedDateStr,
          reason: blockDateReason,
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? 'Failed to block date')
      }

      setBlockedDates((prev) => [...prev, selectedDateStr])
      setBlockDateReason("")
      setIsBlockDateModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block date")
    }
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    )
  }

  // Build calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  return (
    <div className="flex h-full min-h-[600px] w-full bg-background rounded-xl overflow-hidden border border-slate-200 shadow-sm dark:border-slate-800">
      {error && (
        <div className="absolute top-4 left-4 right-4 p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-200 text-[11px] font-sans z-50">
          {error}
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <p className="text-muted-foreground font-sans text-[11px]">Loading calendar data...</p>
        </div>
      )}
      <main className="w-[70%] flex flex-col border-r border-border">
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 max-w-full">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth} className="h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground min-w-[180px] text-center font-sans">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 text-cyber border-cyber/50 hover:bg-cyber/10 font-sans text-[11px]">
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2 max-w-full">
            <Button variant={filterVip ? "default" : "outline"} size="sm" onClick={() => setFilterVip(!filterVip)} className={`font-sans text-[11px] ${filterVip ? "bg-electric text-white hover:bg-electric/90" : ""}`}>
              VIP Only
            </Button>
            <Button variant={filterLargeGroup ? "default" : "outline"} size="sm" onClick={() => setFilterLargeGroup(!filterLargeGroup)} className="font-sans text-[11px]">
              Large Groups (6+)
            </Button>
            <Button variant={filterStatus !== "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(filterStatus === "all" ? "confirmed" : "all")} className="font-sans text-[11px]">
              Status
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4 flex flex-col">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-muted-foreground py-2 font-sans text-[11px]">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1">
            {calendarDays.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} className="p-2" />

              const dateKey = formatDateKey(currentYear, currentMonth, day)
              const dayReservations = reservationsByDate[dateKey]
              const selected = isSelected(day)
              const isBlocked = blockedDates.includes(dateKey)

              return (
                <button key={day} onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))} className={`p-2 rounded-sm flex flex-col items-center justify-start min-h-[80px] transition-all ${isBlocked ? "bg-red-500/30 border-2 border-red-500" : selected ? "bg-cyber/20 border border-cyber" : "hover:bg-muted/50 border border-transparent"} ${isToday(day) ? "shadow-[0_0_12px_2px_rgba(6,182,212,0.4)]" : ""}`}>
                  <span className={`font-sans text-[11px] ${isBlocked ? "text-red-600 font-bold" : isToday(day) ? "text-cyber font-bold" : "text-foreground"}`}>{day}</span>
                  {isBlocked && <div className="text-red-500 text-[8px] font-bold">BLOCKED</div>}
                  {dayReservations && !isBlocked && (
                    <div className="flex gap-1 mt-2 flex-wrap justify-center">
                      {dayReservations.confirmed > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                      {dayReservations.seated > 0 && <div className="w-2 h-2 rounded-full bg-cyan-500" />}
                      {dayReservations.pending_payment > 0 && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <footer className="flex items-center justify-end p-4 border-t border-border">
          <SystemLiveIndicator />
        </footer>
      </main>

      <aside className="w-[30%] flex flex-col h-full overflow-hidden bg-sidebar">
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <h2 className="font-sans text-[11px] font-bold text-sidebar-foreground uppercase tracking-wider">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase()}
          </h2>
          <p className="font-sans text-[11px] text-muted-foreground mt-1">
            {filteredReservations.length} reservation{filteredReservations.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4 space-y-3 pb-8">
            {filteredReservations.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 font-sans text-[11px]">No reservations for this day</p>
            ) : (
              filteredReservations.map((res) => (
                <div key={res.id} className={`p-3 rounded-sm border font-sans text-[11px] ${res.isVip ? "bg-electric/10 border-electric/30" : "bg-sidebar-accent border-sidebar-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${res.isVip ? "text-electric" : "text-sidebar-foreground"}`}>{res.customer_id}</span>
                    <span className="text-cyber font-mono">{formatTime12h(res.start_time)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{res.tableId}</span>
                      <div className={`w-2 h-2 rounded-full ${statusColors[res.status]}`} />
                    </div>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {res.party_size}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <div className="space-y-2">
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-cyber text-background hover:bg-cyber/90 font-sans text-[11px]">
                  <Plus className="w-4 h-4 mr-2" />
                  New Reservation
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-sans">New Reservation</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddReservation} className="space-y-4 mt-4">
                  <Input placeholder="Guest Name" value={newReservation.customer_id} onChange={(e) => setNewReservation((prev) => ({ ...prev, customer_id: e.target.value }))} className="bg-input border-border font-sans text-[11px]" />
                  <Input type="time" value={newReservation.start_time} onChange={(e) => setNewReservation((prev) => ({ ...prev, start_time: e.target.value }))} className="bg-input border-border font-sans text-[11px]" />
                  <Input type="number" placeholder="Pax" min="1" max="12" value={newReservation.party_size} onChange={(e) => setNewReservation((prev) => ({ ...prev, party_size: e.target.value }))} className="bg-input border-border font-sans text-[11px]" />
                  <Input placeholder="Table ID (e.g., T14)" value={newReservation.tableId} onChange={(e) => setNewReservation((prev) => ({ ...prev, tableId: e.target.value }))} className="bg-input border-border font-sans text-[11px]" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newReservation.isVip} onChange={(e) => setNewReservation((prev) => ({ ...prev, isVip: e.target.checked }))} className="w-4 h-4 accent-electric" />
                    <span className="text-muted-foreground font-sans text-[11px]">VIP Guest</span>
                  </label>
                  {reservationValidationError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[11px] font-sans flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{reservationValidationError}</span>
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-cyber text-background hover:bg-cyber/90 font-sans text-[11px]">Add Reservation</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isBlockDateModalOpen} onOpenChange={setIsBlockDateModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 font-sans text-[11px]">
                  <Lock className="w-4 h-4 mr-2" />
                  Block Date
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-sans">Block Date</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBlockDate} className="space-y-4 mt-4">
                  <p className="text-muted-foreground font-sans text-[11px]">
                    Blocking: {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <Input
                    placeholder="Reason (e.g., Private Event, Holiday)"
                    value={blockDateReason}
                    onChange={(e) => setBlockDateReason(e.target.value)}
                    className="bg-input border-border font-sans text-[11px]"
                  />
                  <Button type="submit" className="w-full bg-red-600 text-white hover:bg-red-700 font-sans text-[11px]">Block Date</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isOperatingHoursModalOpen} onOpenChange={setIsOperatingHoursModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-sans text-[11px]">
                  <Activity className="w-4 h-4 mr-2" />
                  Operating Hours
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-sans">Set Operating Hours</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleOperatingHours} className="space-y-4 mt-4">
                  <div>
                    <label className="text-muted-foreground font-sans text-[11px] block mb-1">Opening Hour</label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={operatingHours.opening}
                      onChange={(e) => setOperatingHours((prev) => ({ ...prev, opening: Number(e.target.value) }))}
                      className="bg-input border-border font-sans text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-sans text-[11px] block mb-1">Closing Hour</label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={operatingHours.closing}
                      onChange={(e) => setOperatingHours((prev) => ({ ...prev, closing: Number(e.target.value) }))}
                      className="bg-input border-border font-sans text-[11px]"
                    />
                  </div>
                  {operatingHoursError && (
                    <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[11px] font-sans flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{operatingHoursError}</span>
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-cyber text-background hover:bg-cyber/90 font-sans text-[11px]">Save Hours</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function ReservationsPage() {
  return (
    <div className="flex flex-col gap-6 p-8 w-full max-w-full mx-auto">
      <header>
        <h1 className="text-lg font-semibold font-heading text-sidebar-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-bold" />
          Master Calendar
        </h1>
        <p className="text-sm text-slate-500 italic">Manage all upcoming reservations</p>
      </header>
      <section className="w-full h-[800px]">
        <MasterCalendar />
      </section>
    </div>
  );
}