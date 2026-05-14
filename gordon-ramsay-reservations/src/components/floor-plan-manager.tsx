"use client";

import * as React from "react";
import { Users, Clock, UtensilsCrossed, CircleDot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import supabase from "@/lib/authClient";

// Database enum: table_status
type TableStatus = "available" | "reserved" | "occupied" | "dirty";

// Database schema: public.tables
interface TableData {
  id: string; // UUID, PK
  table_number: number; // INTEGER, NOT NULL, UNIQUE
  capacity: number; // INTEGER, NOT NULL, CHECK (> 0)
  status: TableStatus; // table_status, NOT NULL, DEFAULT 'available'
  position_x: number; // INTEGER, NOT NULL, DEFAULT 0
  position_y: number; // INTEGER, NOT NULL, DEFAULT 0
  is_combinable: boolean; // BOOLEAN, NOT NULL, DEFAULT true
  adjacent_table_ids: string[]; // UUID[], DEFAULT '{}'
  created_at: string; // TIMESTAMPTZ, NOT NULL, DEFAULT now()
  updated_at: string; // TIMESTAMPTZ, NOT NULL, DEFAULT now()
  // Runtime state (not persisted)
  guestName?: string;
  guestCount?: number;
}

interface Reservation {
  id: string;
  name: string;
  time: string;
  tableId: string;
  pax: number;
}

// Mock data matching the database schema
const initialTables: TableData[] = [
  // Front Row (position_y: 0)
  {
    id: "a1b2c3d4-0001-4000-8000-000000000001",
    table_number: 1,
    capacity: 2,
    status: "available",
    position_x: 0,
    position_y: 0,
    is_combinable: true,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000002"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000002",
    table_number: 2,
    capacity: 2,
    status: "reserved",
    position_x: 1,
    position_y: 0,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000001",
      "a1b2c3d4-0001-4000-8000-000000000003",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Martinez",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000003",
    table_number: 3,
    capacity: 4,
    status: "available",
    position_x: 2,
    position_y: 0,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000002",
      "a1b2c3d4-0001-4000-8000-000000000004",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000004",
    table_number: 4,
    capacity: 4,
    status: "occupied",
    position_x: 3,
    position_y: 0,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000003",
      "a1b2c3d4-0001-4000-8000-000000000005",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Chen",
    guestCount: 3,
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000005",
    table_number: 5,
    capacity: 4,
    status: "dirty",
    position_x: 4,
    position_y: 0,
    is_combinable: true,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000004"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  // Middle Row (position_y: 1)
  {
    id: "a1b2c3d4-0001-4000-8000-000000000006",
    table_number: 6,
    capacity: 2,
    status: "occupied",
    position_x: 0,
    position_y: 1,
    is_combinable: true,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000007"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Smith",
    guestCount: 2,
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000007",
    table_number: 7,
    capacity: 2,
    status: "available",
    position_x: 1,
    position_y: 1,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000006",
      "a1b2c3d4-0001-4000-8000-000000000008",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000008",
    table_number: 8,
    capacity: 4,
    status: "reserved",
    position_x: 2,
    position_y: 1,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000007",
      "a1b2c3d4-0001-4000-8000-000000000009",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Johnson",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000009",
    table_number: 9,
    capacity: 4,
    status: "available",
    position_x: 3,
    position_y: 1,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000008",
      "a1b2c3d4-0001-4000-8000-000000000010",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000010",
    table_number: 10,
    capacity: 4,
    status: "occupied",
    position_x: 4,
    position_y: 1,
    is_combinable: true,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000009"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Williams",
    guestCount: 4,
  },
  // Back Row (position_y: 2)
  {
    id: "a1b2c3d4-0001-4000-8000-000000000011",
    table_number: 11,
    capacity: 6,
    status: "available",
    position_x: 0,
    position_y: 2,
    is_combinable: true,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000012"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000012",
    table_number: 12,
    capacity: 6,
    status: "reserved",
    position_x: 1,
    position_y: 2,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000011",
      "a1b2c3d4-0001-4000-8000-000000000013",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Davis",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000013",
    table_number: 13,
    capacity: 6,
    status: "occupied",
    position_x: 2,
    position_y: 2,
    is_combinable: true,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000012",
      "a1b2c3d4-0001-4000-8000-000000000014",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    guestName: "Brown",
    guestCount: 5,
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000014",
    table_number: 14,
    capacity: 8,
    status: "available",
    position_x: 3,
    position_y: 2,
    is_combinable: false,
    adjacent_table_ids: [
      "a1b2c3d4-0001-4000-8000-000000000013",
      "a1b2c3d4-0001-4000-8000-000000000015",
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "a1b2c3d4-0001-4000-8000-000000000015",
    table_number: 15,
    capacity: 8,
    status: "dirty",
    position_x: 4,
    position_y: 2,
    is_combinable: false,
    adjacent_table_ids: ["a1b2c3d4-0001-4000-8000-000000000014"],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const initialReservations: Reservation[] = [
  { id: "R1", name: "Martinez", time: "18:30", tableId: "T2", pax: 2 },
  { id: "R2", name: "Johnson", time: "19:00", tableId: "T8", pax: 4 },
  { id: "R3", name: "Davis", time: "19:30", tableId: "T12", pax: 6 },
  { id: "R4", name: "Anderson", time: "20:00", tableId: "T14", pax: 7 },
  { id: "R5", name: "Taylor", time: "20:30", tableId: "T3", pax: 3 },
];

const statusColors: Record<TableStatus, string> = {
  available: "bg-emerald-500",
  reserved: "bg-amber-500",
  occupied: "bg-red-500",
  dirty: "bg-slate-500",
};

const statusLabels: Record<TableStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  dirty: "Dirty",
};

function TableComponent({
  table,
  disabled,
  onStatusChange,
}: {
  table: TableData;
  disabled?: boolean;
  onStatusChange: (id: string, status: TableStatus) => void;
}) {
  const isCircular = table.capacity <= 4;
  const baseSize = isCircular ? "w-16 h-16" : "w-24 h-14";
  const shape = isCircular ? "rounded-full" : "rounded-sm";

  return (
    <div className="flex h-20 w-24 items-center justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className={`${baseSize} ${shape} ${statusColors[table.status]} relative flex flex-col items-center justify-center transition-all hover:scale-105 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyber focus:ring-offset-2 focus:ring-offset-background`}
            style={{ fontFamily: "Arial", fontSize: "11px" }}
          >
            <span className="font-bold text-white">T{table.table_number}</span>
            <span className="text-white/80">{table.capacity}p</span>
            {table.is_combinable && (
              <span
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyber"
                title="Combinable"
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-35">
          {(Object.keys(statusColors) as TableStatus[]).map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(table.id, status)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
              <span>{statusLabels[status]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function hasAvailableAdjacentTables(
  table: TableData,
  tableById: Map<string, TableData>,
) {
  return table.adjacent_table_ids.some((adjacentId) => {
    const adjacentTable = tableById.get(adjacentId);
    return Boolean(
      adjacentTable &&
      adjacentTable.is_combinable &&
      adjacentTable.status === "available",
    );
  });
}

function Legend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-sm border border-border">
      {(Object.keys(statusColors) as TableStatus[]).map((status) => (
        <div
          key={status}
          className="flex items-center gap-2"
          style={{ fontFamily: "Arial", fontSize: "11px" }}
        >
          <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
          <span className="text-muted-foreground">{statusLabels[status]}</span>
        </div>
      ))}
    </div>
  );
}

function OnlineIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-card/50 backdrop-blur-sm rounded-sm border border-border">
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
      <span
        className="text-emerald-400"
        style={{ fontFamily: "Arial", fontSize: "11px" }}
      >
        Online
      </span>
    </div>
  );
}

export function FloorPlanManager() {
  const [tables, setTables] = React.useState<TableData[]>(initialTables);
  const [reservations] = React.useState<Reservation[]>(initialReservations);
  const [walkInName, setWalkInName] = React.useState("");
  const [walkInPax, setWalkInPax] = React.useState("");
  const [walkInTable, setWalkInTable] = React.useState("");
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [loadingTables, setLoadingTables] = React.useState(true);
  const [tableError, setTableError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadTables() {
      try {
        const response = await fetch("/api/admin/tables", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = (await response.json()) as {
          tables?: TableData[];
          error?: string;
        };

        if (!response.ok || !payload.tables) {
          throw new Error(payload.error ?? "Failed to load floor plan data.");
        }

        if (isMounted) {
          setTables(payload.tables);
          setTableError(null);
        }
      } catch (error) {
        if (isMounted) {
          setTableError(
            error instanceof Error
              ? error.message
              : "Failed to load floor plan data.",
          );
        }
      } finally {
        if (isMounted) {
          setLoadingTables(false);
        }
      }
    }

    loadTables();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    const channel = supabase
      .channel("public:tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          const newRow = payload.new as Partial<TableData> | null;
          const oldRow = payload.old as Partial<TableData> | null;

          if (payload.eventType === "DELETE" && oldRow?.id) {
            setTables((current) =>
              current.filter((table) => table.id !== oldRow.id),
            );
            return;
          }

          if (!newRow?.id) return;

          setTables((current) => {
            const nextTable: TableData = {
              ...(current.find((table) => table.id === newRow.id) ??
                ({} as TableData)),
              ...newRow,
              guestName:
                current.find((table) => table.id === newRow.id)?.guestName ??
                undefined,
              guestCount:
                current.find((table) => table.id === newRow.id)?.guestCount ??
                undefined,
            } as TableData;

            const exists = current.some((table) => table.id === newRow.id);
            if (exists) {
              return current.map((table) =>
                table.id === newRow.id ? nextTable : table,
              );
            }

            return [...current, nextTable].sort((left, right) => {
              if (left.position_y !== right.position_y)
                return left.position_y - right.position_y;
              return left.position_x - right.position_x;
            });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = (id: string, status: TableStatus) => {
    if (!isOnline) return;

    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...table, status } : table)),
    );
  };

  const handleWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;

    if (!walkInName || !walkInPax || !walkInTable) return;

    setTables((prev) =>
      prev.map((table) =>
        table.id === walkInTable
          ? {
              ...table,
              status: "occupied" as TableStatus,
              guestName: walkInName,
              guestCount: parseInt(walkInPax),
            }
          : table,
      ),
    );
    setWalkInName("");
    setWalkInPax("");
    setWalkInTable("");
  };

  const handleMarkDirty = async (tableId: string) => {
    if (!isOnline) return;

    try {
      const response = await fetch(`/api/admin/tables/${tableId}/mark-dirty`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        console.error(
          "Failed to mark table dirty:",
          payload.error ?? "Unknown error",
        );
        return;
      }

      // Update local state: mark table as dirty
      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? { ...table, status: "dirty" as TableStatus }
            : table,
        ),
      );
    } catch (error) {
      console.error("Error marking table dirty:", error);
    }
  };

  const occupiedTables = tables.filter((t) => t.status === "occupied");
  const tableById = React.useMemo(
    () => new Map(tables.map((table) => [table.id, table])),
    [tables],
  );

  // Organize tables by position_y for the grid
  const rows = [0, 1, 2].map((rowIndex) =>
    tables
      .filter((t) => t.position_y === rowIndex)
      .sort((a, b) => a.position_x - b.position_x),
  );

  return (
    <div className="flex h-screen w-full flex-col bg-background xl:flex-row">
      {/* Left Sidebar */}
      <aside className="flex h-auto w-full shrink-0 flex-col overflow-hidden border-b border-border bg-sidebar xl:h-screen xl:w-80 xl:border-b-0 xl:border-r">
        <div className="p-4 border-b border-sidebar-border shrink-0">
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
            {!isOnline && (
              <div className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Offline Warning: table interactions are disabled until the
                connection is restored.
              </div>
            )}

            {tableError && (
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {tableError}
              </div>
            )}

            {loadingTables && (
              <div className="rounded-sm border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                Loading floor plan data...
              </div>
            )}

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
                      <span className="font-medium text-sidebar-foreground">
                        {res.name}
                      </span>
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
                  disabled={!isOnline}
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
                  disabled={!isOnline}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                />
                <Input
                  placeholder="Table Number (e.g., T1)"
                  value={walkInTable}
                  onChange={(e) => setWalkInTable(e.target.value.toUpperCase())}
                  disabled={!isOnline}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  style={{ fontFamily: "Arial", fontSize: "11px" }}
                />
                <Button
                  type="submit"
                  disabled={!isOnline}
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
                  <p
                    className="text-muted-foreground text-center py-4"
                    style={{ fontFamily: "Arial", fontSize: "11px" }}
                  >
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
                        <span className="font-medium text-sidebar-foreground">
                          {table.guestName}
                        </span>
                        <span className="text-red-400 font-mono">
                          T{table.table_number}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-muted-foreground">
                        <span>Capacity: {table.capacity}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {table.guestCount || "-"}
                        </span>
                      </div>
                      {table.is_combinable &&
                        hasAvailableAdjacentTables(table, tableById) && (
                          <div className="mt-1 text-cyber text-[10px]">
                            Can combine with adjacent tables
                          </div>
                        )}
                      <Button
                        onClick={() => handleMarkDirty(table.id)}
                        disabled={!isOnline}
                        className="mt-2 w-full bg-amber-600 text-white text-[10px] h-7 hover:bg-amber-700"
                      >
                        Mark Dirty
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Floor Plan */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header with Legend */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2
            className="text-lg font-semibold text-foreground"
            style={{ fontFamily: "Arial" }}
          >
            Interactive Floor Plan
          </h2>
          <Legend />
        </header>

        {/* Floor Plan Grid */}
        <div className="relative flex-1 items-center justify-start overflow-x-auto p-4 xl:justify-center xl:p-8">
          <div className="min-w-max space-y-4">
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
                    disabled={!isOnline}
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
                    disabled={!isOnline}
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
                    disabled={!isOnline}
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
  );
}
