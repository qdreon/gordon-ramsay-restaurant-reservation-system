/**
 * page.tsx (admin floorplan stub)
 * --------------------------------
 * Placeholder page for the Admin Floor Plan dashboard.
 *
 * Purpose:
 *   Represents Phase 4, Subtask 4.1 (QDR-69-70).
 *   Full implementation will include:
 *   - Real-time WebSocket connection to the Tables database (Observer Pattern)
 *   - Visual grid of restaurant tables with color-coding (FR-7)
 *   - Offline failsafe with warning banner (SAF-2)
 */

export default function AdminFloorPlanPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Floor Plan Dashboard</h1>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-900/20">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          QDR-69 to QDR-70: Real-time floor plan grid coming in Phase 4.
        </p>
        <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
          Features: Color-coded table statuses (Green/Yellow/Red/Grey), WebSocket real-time updates,
          offline failsafe.
        </p>
      </div>
    </div>
  );
}
