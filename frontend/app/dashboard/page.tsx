"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import DashboardStatCards from "@/src/components/dashboard/DashboardStatCards";
import DashboardSignalsPanel from "@/src/components/dashboard/DashboardSignalsPanel";
import DashboardWelcome from "@/src/components/dashboard/DashboardWelcome";
import RecentActivityFeed from "@/src/components/dashboard/RecentActivityFeed";
import TasksTodayPanel from "@/src/components/dashboard/TasksTodayPanel";
import {
  AuthError,
  getAnalyticsV1Overview,
  getPipelineHealth,
  getTasksBucket,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { mergeOperationalSnapshot } from "@/src/lib/taskSemantics";
import type { AnalyticsV1Overview, CrmTask, PipelineHealth } from "@/src/types";

export default function DashboardPage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsV1Overview | null>(null);
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [operationalTasks, setOperationalTasks] = useState<CrmTask[]>([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
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

        const [analytics, pipelineHealth, overdue, today, completed] =
          await Promise.all([
            getAnalyticsV1Overview(tenantId, "week"),
            getPipelineHealth(tenantId),
            getTasksBucket(tenantId, "overdue", { scope: "my" }),
            getTasksBucket(tenantId, "today", { scope: "my" }),
            getTasksBucket(tenantId, "completed", { scope: "my" }),
          ]);

        setOverview(analytics);
        setHealth(pipelineHealth);
        setOperationalTasks(mergeOperationalSnapshot(overdue, today));
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
        setCompletedTodayCount(completedToday.length);
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

  const openTaskCount = operationalTasks.length;

  return (
    <ProtectedRoute>
      <div className="space-y-5">
        <DashboardWelcome />

        {error ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </p>
        ) : null}

        <DashboardStatCards
          loading={loading}
          revenue={overview?.kpis.won_this_month_revenue ?? "0"}
          activeDeals={overview?.kpis.active_deals ?? 0}
          tasksToday={openTaskCount}
          tasksCompletedToday={completedTodayCount}
          needsAttention={needsAttention}
        />

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_20rem]">
          <div className="lg:col-span-2">
            <RecentActivityFeed
              loading={loading}
              items={overview?.recent_activity ?? []}
            />
          </div>
          <DashboardSignalsPanel health={health} loading={loading} />
        </div>

        <div className="max-w-md">
          <TasksTodayPanel
            loading={loading}
            tasks={operationalTasks}
            completedTodayCount={completedTodayCount}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
