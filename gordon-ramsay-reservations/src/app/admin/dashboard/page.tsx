
import { FloorPlanManager } from "@/components/floor-plan-manager";
import { SystemHealthMonitor } from "@/components/SystemHealthMonitor";

export default function AdminDashboard() {
  return (
    <div className="flex h-full w-full flex-col gap-6 p-3 sm:p-4">
      {/* System Health Widget (FR-13 / QDR-79) */}
      <div className="max-w-xl rounded-3xl border border-white/10 bg-black/20 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">System Status</h2>
        <SystemHealthMonitor />
      </div>

      {/* Floor Plan Manager */}
      <div className="flex-1 rounded-3xl border border-white/10 bg-black/20 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Live Floor Plan</h2>
        <FloorPlanManager />
      </div>
    </div>
  );
}
