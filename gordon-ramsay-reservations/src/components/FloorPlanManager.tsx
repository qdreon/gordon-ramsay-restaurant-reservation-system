"use client";

import * as React from "react";
import { Clock, Users, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

type TableStatus = "available" | "reserved" | "occupied" | "dirty";

interface TableData {
  id: string;
  capacity: number;
  row: number;
  col: number;
  status: TableStatus;
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

type TableRealtimeRow = {
  id?: string;
  status?: TableStatus;
  table_status?: TableStatus;
  guest_name?: string;
  guestName?: string;
};

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

const initialTables: TableData[] = [
  { id: "T1", capacity: 2, row: 0, col: 0, status: "available" },
  {
    id: "T2",
    capacity: 2,
    row: 0,
    col: 1,
    status: "reserved",
    guestName: "Martinez",
  },
  { id: "T3", capacity: 4, row: 0, col: 2, status: "available" },
  {
    id: "T4",
    capacity: 4,
    row: 0,
    col: 3,
    status: "occupied",
    guestName: "Chen",
    guestCount: 3,
  },
  { id: "T5", capacity: 4, row: 0, col: 4, status: "dirty" },
  {
    id: "T6",
    capacity: 2,
    row: 1,
    col: 0,
    status: "occupied",
    guestName: "Smith",
    guestCount: 2,
  },
  { id: "T7", capacity: 2, row: 1, col: 1, status: "available" },
  {
    id: "T8",
    capacity: 4,
    row: 1,
    col: 2,
    status: "reserved",
    guestName: "Johnson",
  },
  { id: "T9", capacity: 4, row: 1, col: 3, status: "available" },
  {
    id: "T10",
    capacity: 4,
    row: 1,
    col: 4,
    status: "occupied",
    guestName: "Williams",
    guestCount: 4,
  },
  { id: "T11", capacity: 6, row: 2, col: 0, status: "available" },
  {
    id: "T12",
    capacity: 6,
    row: 2,
    col: 1,
    status: "reserved",
    guestName: "Davis",
  },
  {
    id: "T13",
    capacity: 6,
    row: 2,
    col: 2,
    status: "occupied",
    guestName: "Brown",
    guestCount: 5,
  },
  { id: "T14", capacity: 8, row: 2, col: 3, status: "available" },
  { id: "T15", capacity: 8, row: 2, col: 4, status: "dirty" },
];

const initialReservations: Reservation[] = [
  { id: "R1", name: "Martinez", time: "18:30", tableId: "T2", pax: 2 },
  { id: "R2", name: "Johnson", time: "19:00", tableId: "T8", pax: 4 },
  { id: "R3", name: "Davis", time: "19:30", tableId: "T12", pax: 6 },
  { id: "R4", name: "Anderson", time: "20:00", tableId: "T14", pax: 7 },
  { id: "R5", name: "Taylor", time: "20:30", tableId: "T3", pax: 3 },
];

function statusForSummary(tables: TableData[], status: TableStatus) {
  return tables.filter((table) => table.status === status).length;
}

export function FloorPlanManager() {
  const [tables, setTables] = React.useState<TableData[]>(initialTables);
  const [selectedTableId, setSelectedTableId] = React.useState(
    initialTables[0]?.id ?? "",
  );
  const [reservations] = React.useState<Reservation[]>(initialReservations);

  React.useEffect(() => {
    const channel = supabase
      .channel("public:tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        (payload) => {
          const newRow = payload?.new as TableRealtimeRow | null;
          if (!newRow?.id) return;

          // Support multiple column names for status depending on schema
          const newStatus = newRow.table_status ?? newRow.status;
          const guestName = newRow.guest_name ?? newRow.guestName;

          if (newStatus) {
            setTables((current) =>
              current.map((t) =>
                t.id === newRow.id
                  ? {
                      ...t,
                      status: newStatus,
                      guestName: guestName ?? t.guestName,
                    }
                  : t,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const selectedTable =
    tables.find((table) => table.id === selectedTableId) ?? tables[0];
  const rows = [0, 1, 2].map((rowIndex) =>
    tables
      .filter((table) => table.row === rowIndex)
      .sort((left, right) => left.col - right.col),
  );

  const updateStatus = (tableId: string, status: TableStatus) => {
    setTables((currentTables) =>
      currentTables.map((table) =>
        table.id === tableId ? { ...table, status } : table,
      ),
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl shadow-slate-950/20 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-200">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Admin Floor Plan
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Restaurant table control
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
                Phase 4 scaffold for table status management, reservation
                visibility, and live status work.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              ["available", "reserved", "occupied", "dirty"] as TableStatus[]
            ).map((status) => (
              <div
                key={status}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  {statusLabels[status]}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {statusForSummary(tables, status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Dining room map
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Click a table to inspect it, then change its status.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusColors) as TableStatus[]).map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`}
                  />
                  {statusLabels[status]}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
            {rows.flat().map((table) => {
              const isSelected = table.id === selectedTable?.id;

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => setSelectedTableId(table.id)}
                  className={`min-h-24 rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  } bg-slate-50 dark:bg-slate-900`}
                >
                  <div
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white ${statusColors[table.status]}`}
                  >
                    {statusLabels[table.status]}
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {table.id}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Seats {table.capacity}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      <div>Row {table.row + 1}</div>
                      <div>Column {table.col + 1}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              Upcoming reservations
            </div>
            <div className="mt-4 space-y-3">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {reservation.name}
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {reservation.time}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{reservation.tableId}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {reservation.pax}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Selected table
            </div>
            {selectedTable ? (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {selectedTable.id}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Capacity {selectedTable.capacity}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusColors[selectedTable.status]}`}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {statusLabels[selectedTable.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(statusColors) as TableStatus[]).map(
                    (status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={
                          selectedTable.status === status
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className="w-full"
                        onClick={() => updateStatus(selectedTable.id, status)}
                      >
                        {statusLabels[status]}
                      </Button>
                    ),
                  )}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedTable.guestName
                    ? `Guest: ${selectedTable.guestName}`
                    : "No guest assigned yet."}
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
