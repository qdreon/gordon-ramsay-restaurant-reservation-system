
import { FloorPlanManager } from "@/components/floor-plan-manager";
import { SystemHealthMonitor } from "@/components/SystemHealthMonitor";

export default function AdminDashboard() {
  return (
    <div className="h-full w-full flex flex-col gap-6 p-6">
      {/* System Health Widget (FR-13 / QDR-79) */}
      <div className="max-w-md">
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">System Status</h2>
        <SystemHealthMonitor />
      </div>

      {/* Floor Plan Manager */}
      <div className="flex-1">
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Live Floor Plan</h2>
        <FloorPlanManager />
      </div>
    </div>
  );
}
