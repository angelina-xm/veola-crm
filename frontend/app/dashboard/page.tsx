"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import DashboardStatCards from "@/src/components/dashboard/DashboardStatCards";
import RecentActivityFeed from "@/src/components/dashboard/RecentActivityFeed";
import TasksTodayPanel from "@/src/components/dashboard/TasksTodayPanel";
import {
  AuthError,
  getAnalyticsV1Overview,
  getPipelineHealth,
  getTasksBucket,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { AnalyticsV1Overview, CrmTask, PipelineHealth } from "@/src/types";

export default function DashboardPage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsV1Overview | null>(null);
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [tasksToday, setTasksToday] = useState<CrmTask[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState<CrmTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    const next = getStoredCompanyId() ?? readEnvCompanyId();
    setCompanyId((prev) => (prev !== next ? next : prev));
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const tenantId = getStoredCompanyId() ?? companyId;

        const [analytics, pipelineHealth, today, completed] = await Promise.all([
          getAnalyticsV1Overview(tenantId, "week"),
          getPipelineHealth(tenantId),
          getTasksBucket(tenantId, "today"),
          getTasksBucket(tenantId, "completed"),
        ]);

        setOverview(analytics);
        setHealth(pipelineHealth);
        setTasksToday(today);
        const completedToday = completed.filter((t) => {
          if (!t.completed_at) return false;
          const d = new Date(t.completed_at);
          const now = new Date();
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        });
        setTasksCompleted(completedToday);
      } catch (err) {
        if (err instanceof AuthError) {
          logout(err.reason);
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [companyId, isReady, isAuthenticated, logout]);

  const needsAttention = useMemo(() => {
    if (!health) return 0;
    return health.attention_needed + health.at_risk;
  }, [health]);

  const taskRows = useMemo(() => {
    const open = tasksToday.filter((t) => !t.is_completed);
    const done = tasksToday.filter((t) => t.is_completed);
    return [...open, ...done].slice(0, 10);
  }, [tasksToday]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <p className="text-sm text-zinc-500">
          Your operational cockpit — revenue, pipeline health, and what needs
          attention today.
        </p>

        {error ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        <DashboardStatCards
          loading={loading}
          revenue={overview?.kpis.won_this_month_revenue ?? "0"}
          activeDeals={overview?.kpis.active_deals ?? 0}
          tasksToday={tasksToday.filter((t) => !t.is_completed).length}
          tasksCompletedToday={tasksCompleted.length}
          needsAttention={needsAttention}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivityFeed
              loading={loading}
              items={overview?.recent_activity ?? []}
            />
          </div>
          <TasksTodayPanel loading={loading} tasks={taskRows} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/pipeline"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            Open pipeline →
          </Link>
          <Link
            href="/tasks"
            className="rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            View all tasks →
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
