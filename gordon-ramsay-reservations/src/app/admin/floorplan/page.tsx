import { FloorPlanManager } from "@/components/floor-plan-manager";

export default function Floorplan() {
  return (
    <div className="h-full w-full rounded-3xl border border-white/10 bg-black/20 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.3)] backdrop-blur sm:p-4">
      <FloorPlanManager />
    </div>
  );
}
