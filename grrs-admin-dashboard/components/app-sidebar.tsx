import * as React from "react"

import { SearchForm } from "@/components/search-form"
import { VersionSwitcher } from "@/components/version-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  // Document versioning as per SRS Section 1.1 [cite: 5, 96, 102]
  versions: ["v1.0"],
  navMain: [
    {
      title: "Operations Hub",
      url: "#",
      items: [
        {
          title: "Live Floor Plan", // Traces to FR-7 [cite: 284, 896]
          url: "/admin/dashboard",
          isActive: true,
        },
        {
          title: "Master Calendar", // Traces to FR-8 [cite: 287, 896]
          url: "/admin/calendar",
        },
        {
          title: "Waitlist Queue", // Traces to FR-12 [cite: 292, 897]
          url: "/admin/waitlist",
        },
      ],
    },
    {
      title: "Administration",
      url: "#",
      items: [
        {
          title: "Guest CRM", // Traces to FR-9 [cite: 289, 896]
          url: "/admin/crm",
        },
        {
          title: "Menu Management", // Traces to FR-11 [cite: 291, 896]
          url: "/admin/menu",
        },
      ],
    },
    {
      title: "System & Compliance",
      url: "#",
      items: [
        {
          title: "System Health", // Traces to FR-13 [cite: 293, 897]
          url: "/admin/health",
        },
        {
          title: "Legal & Privacy", // Traces to LEG-1 [cite: 507, 898]
          url: "/admin/legal",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props} className="bg-slate-950 border-r border-slate-800">
      <SidebarHeader className="p-4 border-b border-slate-800">
        {/* Branding header for the single-tenant location [cite: 107, 572, 964] */}
        <div className="flex flex-col gap-1 mb-2 px-2">
          <h1 className="text-sm font-black tracking-tighter text-white uppercase italic">
            Gordon Ramsay
          </h1>
          <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">
            Reservations
          </span>
        </div>
        
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
        <SearchForm className="mt-2" />
      </SidebarHeader>

      <SidebarContent className="px-2">
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-4 mb-2">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={item.isActive}
                      className="text-[11px] font-medium transition-all hover:bg-slate-900"
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        {/* Bullet point visual for metallic aesthetic */}
                        <div className={`h-1 w-1 rounded-full ${item.isActive ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                        {item.title}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
