"use client"

import * as React from "react"
import { UsersRound, Search, Download, Filter, User, ChevronDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Database schema: customers table
interface Customer {
  id: string // UUID, PK
  user_id: string // UUID, FK -> users
  dietary_restrictions: string | null
  allergies: string | null
  vip_status: boolean
  total_visits: number
  total_no_shows: number
  staff_notes: string | null
  created_at: string // TIMESTAMPTZ
  updated_at: string // TIMESTAMPTZ
}

// Joined user data for display
interface User {
  id: string
  full_name: string
  phone: string | null
  email: string
}

interface CustomerWithUser extends Customer {
  user: User
}

// Mock data matching the database schema
const mockCustomers: CustomerWithUser[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    user_id: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
    dietary_restrictions: "Vegetarian, Low-sodium",
    allergies: null,
    vip_status: true,
    total_visits: 47,
    total_no_shows: 0,
    staff_notes: "Prefers corner table. Anniversary dinner regular.",
    created_at: "2023-03-15T10:30:00Z",
    updated_at: "2024-01-15T18:45:00Z",
    user: {
      id: "u1a2b3c4-d5e6-7890-abcd-ef1234567890",
      full_name: "Alexandra Rothschild",
      phone: "+1 (212) 555-0142",
      email: "a.rothschild@luxmail.com",
    },
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    user_id: "u2b3c4d5-e6f7-8901-bcde-f12345678901",
    dietary_restrictions: null,
    allergies: "Shellfish, Tree nuts",
    vip_status: false,
    total_visits: 12,
    total_no_shows: 2,
    staff_notes: "Has cancelled twice last minute.",
    created_at: "2023-08-22T14:15:00Z",
    updated_at: "2024-01-10T20:30:00Z",
    user: {
      id: "u2b3c4d5-e6f7-8901-bcde-f12345678901",
      full_name: "Marcus Chen-Williams",
      phone: "+1 (415) 555-0198",
      email: "marcus.cw@techventures.io",
    },
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    user_id: "u3c4d5e6-f7a8-9012-cdef-123456789012",
    dietary_restrictions: "Gluten-free",
    allergies: "Gluten",
    vip_status: true,
    total_visits: 31,
    total_no_shows: 0,
    staff_notes: "Art collector. Appreciates wine recommendations.",
    created_at: "2023-05-10T09:00:00Z",
    updated_at: "2024-01-14T21:15:00Z",
    user: {
      id: "u3c4d5e6-f7a8-9012-cdef-123456789012",
      full_name: "Isabella Fontaine",
      phone: "+1 (310) 555-0167",
      email: "i.fontaine@artcollective.fr",
    },
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    user_id: "u4d5e6f7-a8b9-0123-defa-234567890123",
    dietary_restrictions: null,
    allergies: null,
    vip_status: false,
    total_visits: 3,
    total_no_shows: 3,
    staff_notes: "BLACKLISTED - 100% no-show rate. Do not accept reservations.",
    created_at: "2023-09-05T16:45:00Z",
    updated_at: "2023-11-22T19:00:00Z",
    user: {
      id: "u4d5e6f7-a8b9-0123-defa-234567890123",
      full_name: "Robert J. Harrington",
      phone: "+1 (617) 555-0123",
      email: "rharrington@oldmoney.net",
    },
  },
  {
    id: "e5f6a7b8-c9d0-1234-efab-345678901234",
    user_id: "u5e6f7a8-b9c0-1234-efab-345678901234",
    dietary_restrictions: "Pescatarian",
    allergies: null,
    vip_status: false,
    total_visits: 8,
    total_no_shows: 0,
    staff_notes: null,
    created_at: "2023-11-01T11:30:00Z",
    updated_at: "2024-01-12T13:00:00Z",
    user: {
      id: "u5e6f7a8-b9c0-1234-efab-345678901234",
      full_name: "Sophia Laurent-Kim",
      phone: "+1 (646) 555-0189",
      email: "sophia.lk@fashiongroup.com",
    },
  },
]

function getCustomerStatus(customer: CustomerWithUser): "VIP" | "Regular" | "Blacklisted" {
  if (customer.staff_notes?.toLowerCase().includes("blacklist")) return "Blacklisted"
  if (customer.vip_status) return "VIP"
  return "Regular"
}

function StatusBadge({ customer }: { customer: CustomerWithUser }) {
  const status = getCustomerStatus(customer)
  const variants: Record<typeof status, { className: string }> = {
    VIP: { className: "bg-cyber/10 text-cyber border-cyber/30" },
    Regular: { className: "bg-secondary text-secondary-foreground border-border" },
    Blacklisted: { className: "bg-destructive/10 text-destructive border-destructive/30" },
  }

  return (
    <Badge variant="outline" className={variants[status].className}>
      {status}
    </Badge>
  )
}

export default function GuestCrmDashboard() {
  const [customers, setCustomers] = React.useState<CustomerWithUser[]>(mockCustomers)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerWithUser | null>(null)
  const [editDietary, setEditDietary] = React.useState("")
  const [editAllergies, setEditAllergies] = React.useState("")
  const [editStaffNotes, setEditStaffNotes] = React.useState("")
  const [editVip, setEditVip] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function loadCustomers() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (searchQuery.trim()) params.set("search", searchQuery.trim())
        if (statusFilter !== "all") params.set("status", statusFilter)

        const response = await fetch(`/api/admin/crm?${params.toString()}`)
        const payload = (await response.json()) as {
          customers?: CustomerWithUser[]
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load CRM data")
        }

        if (!cancelled) {
          setCustomers(payload.customers ?? [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load CRM data")
          setCustomers(mockCustomers)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCustomers()

    return () => {
      cancelled = true
    }
  }, [searchQuery, statusFilter])

  const filteredCustomers = customers

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatUUID = (uuid: string) => {
    return uuid.slice(0, 8).toUpperCase()
  }

  function openEditModal(customer: CustomerWithUser) {
    setEditingCustomer(customer)
    setEditDietary(customer.dietary_restrictions ?? "")
    setEditAllergies(customer.allergies ?? "")
    setEditStaffNotes(customer.staff_notes ?? "")
    setEditVip(customer.vip_status)
    setSaveError(null)
  }

  async function handleSaveCustomerProfile() {
    if (!editingCustomer) return

    setSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(`/api/admin/crm/${editingCustomer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dietary_restrictions: editDietary,
          allergies: editAllergies,
          staff_notes: editStaffNotes,
          vip_status: editVip,
        }),
      })

      const payload = (await response.json()) as {
        customer?: CustomerWithUser
        error?: string
      }

      if (!response.ok || !payload.customer) {
        throw new Error(payload.error ?? "Failed to save customer profile")
      }

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === payload.customer!.id ? payload.customer! : customer
        )
      )
      setEditingCustomer(null)
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error ? requestError.message : "Failed to save customer profile"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur sm:p-6">
      <div className="mx-auto max-w-full space-y-6">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold font-heading text-white">
            <UsersRound className="w-5 h-5 text-bold" />
            Guest Database (CRM)
          </h1>

          {/* Control Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-input border-border font-sans text-[11px]"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 bg-input border-border font-sans text-[11px]"
                >
                  <Filter className="h-4 w-4" />
                  Filter by Status
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setStatusFilter("all")}
                  className="font-sans text-[11px]"
                >
                  All Guests
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("VIP")}
                  className="font-sans text-[11px]"
                >
                  VIP Only
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("Regular")}
                  className="font-sans text-[11px]"
                >
                  Regular
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setStatusFilter("Blacklisted")}
                  className="font-sans text-[11px]"
                >
                  Blacklisted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export Button */}
            <Button
              variant="outline"
              className="gap-2 bg-input border-border font-sans text-[11px]"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {error && (
            <div className="px-4 py-3 font-sans text-[11px] text-destructive border-b border-border">
              {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Guest Name & ID
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Contact
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Status
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Dietary / Allergies
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px] text-center">
                  Visits
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px] text-center">
                  No-Shows
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Updated
                </TableHead>
                <TableHead className="font-heading uppercase tracking-widest text-muted-foreground text-[10px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Guest Name & ID */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-sans text-[11px] text-foreground font-medium">
                        {customer.user.full_name}
                      </p>
                      <p className="font-sans text-[11px] text-muted-foreground font-mono">
                        {formatUUID(customer.id)}
                      </p>
                    </div>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-sans text-[11px] text-muted-foreground">
                        {customer.user.phone ?? "No phone"}
                      </p>
                      <p className="font-sans text-[11px] text-muted-foreground">
                        {customer.user.email}
                      </p>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge customer={customer} />
                  </TableCell>

                  {/* Dietary / Allergies */}
                  <TableCell>
                    <div className="space-y-0.5 max-w-[150px]">
                      {customer.dietary_restrictions && (
                        <p className="font-sans text-[11px] text-muted-foreground truncate">
                          {customer.dietary_restrictions}
                        </p>
                      )}
                      {customer.allergies && (
                        <p className="font-sans text-[11px] text-destructive truncate">
                          ⚠ {customer.allergies}
                        </p>
                      )}
                      {!customer.dietary_restrictions && !customer.allergies && (
                        <p className="font-sans text-[11px] text-muted-foreground/50">
                          None
                        </p>
                      )}
                    </div>
                  </TableCell>

                  {/* Total Visits */}
                  <TableCell className="text-center">
                    <span className="font-sans text-[11px] text-muted-foreground">
                      {customer.total_visits}
                    </span>
                  </TableCell>

                  {/* No-Shows */}
                  <TableCell className="text-center">
                    <span
                      className={`font-sans text-[11px] ${
                        customer.total_no_shows > 0
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {customer.total_no_shows}
                    </span>
                  </TableCell>

                  {/* Updated */}
                  <TableCell>
                    <span className="font-sans text-[11px] text-muted-foreground">
                      {formatDate(customer.updated_at)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(customer)}
                      className="h-7 gap-1.5 font-sans text-[11px] text-amber-300 hover:bg-amber-300/10 hover:text-amber-200"
                    >
                      <User className="h-3 w-3" />
                      Edit Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-sans text-[11px] text-muted-foreground">
                {loading ? "Loading guests..." : "No guests found matching your criteria."}
              </p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-zinc-300">
          <p className="font-sans text-[11px]">
            Showing {filteredCustomers.length} of {customers.length} guests
          </p>
          <p className="font-sans text-[11px]">
            {customers.filter((c) => c.vip_status).length} VIP members
          </p>
        </div>

        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl">
              <h2 className="font-heading text-base text-foreground">Edit Guest CRM Profile</h2>
              <p className="mt-1 font-sans text-[11px] text-muted-foreground">
                {editingCustomer.user.full_name} ({formatUUID(editingCustomer.id)})
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Dietary Restrictions</span>
                  <Input
                    value={editDietary}
                    onChange={(e) => setEditDietary(e.target.value)}
                    className="font-sans text-[11px]"
                    placeholder="Vegetarian, low-sodium, etc."
                  />
                </label>

                <label className="space-y-1">
                  <span className="font-sans text-[11px] text-muted-foreground">Allergies</span>
                  <Input
                    value={editAllergies}
                    onChange={(e) => setEditAllergies(e.target.value)}
                    className="font-sans text-[11px]"
                    placeholder="Shellfish, peanuts, etc."
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="font-sans text-[11px] text-muted-foreground">Staff Notes</span>
                  <Textarea
                    value={editStaffNotes}
                    onChange={(e) => setEditStaffNotes(e.target.value)}
                    className="min-h-24 font-sans text-[11px]"
                    placeholder="Service notes, preferences, blacklist rationale, etc."
                  />
                </label>

                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={editVip}
                    onChange={(e) => setEditVip(e.target.checked)}
                    className="h-4 w-4 accent-cyber"
                  />
                  <span className="font-sans text-[11px] text-muted-foreground">Mark as VIP guest</span>
                </label>
              </div>

              {saveError && (
                <p className="mt-4 font-sans text-[11px] text-destructive">{saveError}</p>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCustomer(null)}
                  className="font-sans text-[11px]"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSaveCustomerProfile()}
                  className="font-sans text-[11px]"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

