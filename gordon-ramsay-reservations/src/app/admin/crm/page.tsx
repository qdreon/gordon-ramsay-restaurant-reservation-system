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
  phone: string
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
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.user.phone.includes(searchQuery) ||
      customer.user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const status = getCustomerStatus(customer)
    const matchesStatus = statusFilter === "all" || status === statusFilter

    return matchesSearch && matchesStatus
  })

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-full space-y-6">
        {/* Header */}
        <div className="space-y-6">
          <h1 className="text-lg font-semibold font-heading text-foreground flex items-center gap-2">
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
        <div className="rounded-md border border-border bg-card/50">
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
                        {customer.user.phone}
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
                      className="h-7 gap-1.5 font-sans text-[11px] text-cyber hover:text-cyber hover:bg-cyber/10"
                    >
                      <User className="h-3 w-3" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-sans text-[11px] text-muted-foreground">
                No guests found matching your criteria.
              </p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-muted-foreground">
          <p className="font-sans text-[11px]">
            Showing {filteredCustomers.length} of {mockCustomers.length} guests
          </p>
          <p className="font-sans text-[11px]">
            {mockCustomers.filter((c) => c.vip_status).length} VIP members
          </p>
        </div>
      </div>
    </div>
  )
}

