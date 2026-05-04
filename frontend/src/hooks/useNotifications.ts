"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthError, getNotifications, type NotificationItem } from "@/src/lib/api";

/**
 * Polling GET /notifications/ каждые 60 с (без WebSocket).
 */
export function useNotifications(
  companyId: number | null,
  enabled: boolean
) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (companyId == null || !enabled) return;
    try {
      const list = await getNotifications(companyId);
      setItems(list);
    } catch (e) {
      if (e instanceof AuthError) return;
      setItems([]);
    }
  }, [companyId, enabled]);

  useEffect(() => {
    void load();
    if (!enabled || companyId == null) return undefined;
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load, enabled, companyId]);

  const totalBadge = useMemo(
    () => items.reduce((acc, n) => acc + n.count, 0),
    [items]
  );

  return { items, totalBadge, refresh: load };
}
