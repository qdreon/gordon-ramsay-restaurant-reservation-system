"use client";

import * as React from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  services: {
    supabase: "ok" | "error";
    smtp?: "ok" | "error";
    mailtrap?: "ok" | "error";
    paymentGateway: "ok" | "error";
  };
}

/**
 * System Health Monitor Widget (FR-13 / QDR-79)
 *
 * Displays real-time status of critical system dependencies:
 * - Supabase (Database)
 * - SMTP (Email Service)
 * - Payment Gateway
 *
 * Auto-refreshes every 30 seconds with manual refresh button.
 */
export function SystemHealthMonitor() {
  const [health, setHealth] = React.useState<HealthStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastRefresh, setLastRefresh] = React.useState<string | null>(null);

  const emailStatus =
    health?.services.smtp ?? health?.services.mailtrap ?? "error";

  const fetchHealth = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/health");
      const data = (await response.json()) as HealthStatus;
      setHealth(data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Failed to fetch health status:", error);
      setHealth({
        status: "error",
        timestamp: new Date().toISOString(),
        services: {
          supabase: "error",
          smtp: "error",
          mailtrap: "error",
          paymentGateway: "error",
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    queueMicrotask(() => {
      void fetchHealth();
    });
  }, [fetchHealth]);

  // Auto-refresh every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!health) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 animate-spin" />
          Loading system status...
        </div>
      </div>
    );
  }

  const statusColor =
    health.status === "ok"
      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
      : health.status === "degraded"
        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
        : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900";

  const statusTextColor =
    health.status === "ok"
      ? "text-emerald-700 dark:text-emerald-400"
      : health.status === "degraded"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  const statusIcon =
    health.status === "ok" ? (
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    ) : health.status === "degraded" ? (
      <AlertCircle className="w-5 h-5 text-amber-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );

  return (
    <div className={`p-4 rounded-lg border ${statusColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`font-semibold text-sm ${statusTextColor}`}>
            System Status:{" "}
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </span>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-2 p-2 bg-background/50 rounded text-xs">
          {health.services.supabase === "ok" ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span
            className={
              health.services.supabase === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            Database
          </span>
        </div>

        <div className="flex items-center gap-2 p-2 bg-background/50 rounded text-xs">
          {emailStatus === "ok" ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span
            className={
              emailStatus === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            Email
          </span>
        </div>

        <div className="flex items-center gap-2 p-2 bg-background/50 rounded text-xs">
          {health.services.paymentGateway === "ok" ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span
            className={
              health.services.paymentGateway === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            Payments
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Last updated: {lastRefresh || "checking..."}
      </div>
    </div>
  );
}
