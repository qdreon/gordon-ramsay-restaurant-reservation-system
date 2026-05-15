"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type WaitlistStatus =
  | "waiting"
  | "offered"
  | "accepted"
  | "expired"
  | "cancelled";

type WaitlistEntry = {
  id: string;
  customer_id: string;
  desired_date: string;
  desired_time: string;
  party_size: number;
  position: number;
  status: WaitlistStatus;
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
  customer: {
    id: string;
    vip_status: boolean;
    total_visits: number;
    total_no_shows: number;
    staff_notes: string | null;
    user: {
      id: string;
      full_name: string;
      phone: string | null;
      email: string;
    };
  };
};

type WaitlistFormState = {
  desired_date: string;
  desired_time: string;
  party_size: string;
  position: string;
  status: WaitlistStatus;
};

const DEFAULT_FORM_STATE: WaitlistFormState = {
  desired_date: "",
  desired_time: "19:00",
  party_size: "2",
  position: "1",
  status: "waiting",
};

const STATUS_OPTIONS: Array<{ value: WaitlistStatus | "all"; label: string }> =
  [
    { value: "all", label: "All Entries" },
    { value: "waiting", label: "Waiting" },
    { value: "offered", label: "Offered" },
    { value: "accepted", label: "Accepted" },
    { value: "expired", label: "Expired" },
    { value: "cancelled", label: "Cancelled" },
  ];

function statusLabel(status: WaitlistStatus) {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "offered":
      return "Offered";
    case "accepted":
      return "Accepted";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
  }
}

function statusClass(status: WaitlistStatus) {
  switch (status) {
    case "waiting":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    case "offered":
      return "bg-cyan-500/10 text-cyan-600 border-cyan-500/30";
    case "accepted":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    case "expired":
      return "bg-slate-500/10 text-slate-600 border-slate-500/30";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/30";
  }
}

function isBlacklisted(notes: string | null) {
  return notes?.toLowerCase().includes("blacklist") ?? false;
}

export default function AdminWaitlistPage() {
  const [waitlistEntries, setWaitlistEntries] = React.useState<WaitlistEntry[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    WaitlistStatus | "all"
  >("all");
  const [dateFilter, setDateFilter] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<WaitlistEntry | null>(
    null,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [editForm, setEditForm] =
    React.useState<WaitlistFormState>(DEFAULT_FORM_STATE);

  const fetchWaitlistEntries = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);

      const response = await fetch(`/api/admin/waitlist?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json()) as {
        waitlistEntries?: WaitlistEntry[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load waitlist entries");
      }

      setWaitlistEntries(payload.waitlistEntries ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load waitlist entries",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFilter, searchQuery, statusFilter]);

  React.useEffect(() => {
    queueMicrotask(() => {
      void fetchWaitlistEntries();
    });
  }, [fetchWaitlistEntries]);

  function openEditDialog(entry: WaitlistEntry) {
    setEditingEntry(entry);
    setEditForm({
      desired_date: entry.desired_date,
      desired_time: entry.desired_time.slice(0, 5),
      party_size: entry.party_size.toString(),
      position: entry.position.toString(),
      status: entry.status,
    });
    setActionError(null);
  }

  async function patchEntry(entryId: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/waitlist/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as {
      waitlistEntry?: WaitlistEntry;
      error?: string;
    };

    if (!response.ok || !payload.waitlistEntry) {
      throw new Error(payload.error ?? "Failed to update waitlist entry");
    }

    return payload.waitlistEntry;
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry) return;

    setActionError(null);

    const partySize = Number(editForm.party_size);
    const position = Number(editForm.position);

    if (!editForm.desired_date.trim()) {
      setActionError("Desired date is required.");
      return;
    }

    if (!editForm.desired_time.trim()) {
      setActionError("Desired time is required.");
      return;
    }

    if (!Number.isFinite(partySize) || partySize < 1) {
      setActionError("Party size must be a positive number.");
      return;
    }

    if (!Number.isFinite(position) || position < 1) {
      setActionError("Priority position must be a positive number.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedEntry = await patchEntry(editingEntry.id, {
        desired_date: editForm.desired_date,
        desired_time: `${editForm.desired_time}:00`,
        party_size: partySize,
        position,
        status: editForm.status,
      });

      setWaitlistEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry,
        ),
      );
      setEditingEntry(null);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update waitlist entry",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShiftPosition(entry: WaitlistEntry, delta: number) {
    setActionError(null);

    try {
      const updatedEntry = await patchEntry(entry.id, {
        position: Math.max(1, entry.position + delta),
      });

      setWaitlistEntries((prev) =>
        prev.map((current) =>
          current.id === updatedEntry.id ? updatedEntry : current,
        ),
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to reprioritize waitlist entry",
      );
    }
  }

  async function handleDeleteEntry(entry: WaitlistEntry) {
    const confirmed = window.confirm(
      `Remove ${entry.customer.user.full_name} from the waitlist? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setActionError(null);

    try {
      const response = await fetch(`/api/admin/waitlist/${entry.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to delete waitlist entry");
      }

      setWaitlistEntries((prev) =>
        prev.filter((current) => current.id !== entry.id),
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete waitlist entry",
      );
    }
  }

  const waitingCount = waitlistEntries.filter(
    (entry) => entry.status === "waiting",
  ).length;
  const offeredCount = waitlistEntries.filter(
    (entry) => entry.status === "offered",
  ).length;

  return (
    <div className="flex w-full flex-col gap-6 p-8 font-sans text-[11px] bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold font-heading text-foreground">
            <UsersRound className="h-5 w-5 text-primary" /> Waitlist Control
          </h1>
          <p className="mt-1 italic text-muted-foreground">
            Reorder, review, and clear queue entries for VIP handling and
            walk-in triage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Waiting
            </p>
            <p className="text-base font-semibold text-foreground">
              {waitingCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Offered
            </p>
            <p className="text-base font-semibold text-foreground">
              {offeredCount}
            </p>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search guests..."
              className="h-9 border-input bg-background pl-9 text-foreground focus-visible:ring-ring"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <Input
            type="date"
            className="h-9 w-44 border-input bg-background text-foreground focus-visible:ring-ring"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as WaitlistStatus | "all")
            }
          >
            <SelectTrigger className="h-9 w-44 border-input bg-background">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => void fetchWaitlistEntries()}
          >
            Refresh Queue
          </Button>
        </div>
      </header>

      {error && <p className="text-destructive">{error}</p>}
      {actionError && <p className="text-destructive">{actionError}</p>}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="font-bold uppercase tracking-widest text-muted-foreground">
                Guest
              </TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-muted-foreground">
                Timeslot
              </TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-muted-foreground">
                Party
              </TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-muted-foreground">
                Priority
              </TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-right font-bold uppercase tracking-widest text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waitlistEntries.map((entry) => {
              const vip = entry.customer.vip_status;
              const blacklisted = isBlacklisted(entry.customer.staff_notes);

              return (
                <TableRow
                  key={entry.id}
                  className="border-b border-border transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium text-foreground text-[12px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{entry.customer.user.full_name}</span>
                        {vip && (
                          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                            VIP
                          </Badge>
                        )}
                        {blacklisted && (
                          <Badge className="border-destructive/30 bg-destructive/10 text-destructive">
                            Blacklisted
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.customer.user.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.customer.user.phone ?? "No phone on file"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    <div className="flex flex-col gap-1">
                      <span>{entry.desired_date}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.desired_time.slice(0, 5)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {entry.party_size} pax
                  </TableCell>
                  <TableCell className="text-foreground">
                    #{entry.position}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusClass(entry.status)}
                    >
                      {statusLabel(entry.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleShiftPosition(entry, -1)}
                        className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleShiftPosition(entry, 1)}
                        className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(entry)}
                        className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDeleteEntry(entry)}
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {!loading && waitlistEntries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No waitlist entries found.
                </TableCell>
              </TableRow>
            )}

            {loading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Loading waitlist queue...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!editingEntry}
        onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}
      >
        <DialogContent className="border-border bg-popover text-popover-foreground font-sans text-[11px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading text-primary">
              Edit Waitlist Entry
            </DialogTitle>
          </DialogHeader>

          {editingEntry && (
            <form onSubmit={handleSaveEdit} className="grid gap-4 py-2">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-[10px] text-muted-foreground">
                <p className="font-medium text-foreground">
                  {editingEntry.customer.user.full_name}
                </p>
                <p>{editingEntry.customer.user.email}</p>
                <p>{editingEntry.customer.user.phone ?? "No phone on file"}</p>
              </div>

              <Input
                type="date"
                className="bg-background border-input"
                value={editForm.desired_date}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    desired_date: event.target.value,
                  }))
                }
                required
              />
              <Input
                type="time"
                className="bg-background border-input"
                value={editForm.desired_time}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    desired_time: event.target.value,
                  }))
                }
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="1"
                  className="bg-background border-input"
                  value={editForm.party_size}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      party_size: event.target.value,
                    }))
                  }
                  required
                />
                <Input
                  type="number"
                  min="1"
                  className="bg-background border-input"
                  value={editForm.position}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      position: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    status: value as WaitlistStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full bg-background border-input">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter(
                    (option) => option.value !== "all",
                  ).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                disabled={isSaving}
                className="mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
