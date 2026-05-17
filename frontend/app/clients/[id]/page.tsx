"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import CustomerTimeline from "@/src/components/clients/CustomerTimeline";
import {
  createActivity,
  getClientTimeline,
  getClients,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { Client, ClientTimeline, TimelineFilter } from "@/src/types";

const CATEGORY_OPTIONS = [
  "Pricing",
  "Interest",
  "Objection",
  "Follow up",
  "Other",
] as const;

export default function ClientProfilePage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = String(params?.id ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [timeline, setTimeline] = useState<ClientTimeline | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [addingNote, setAddingNote] = useState(false);
  const [addingCall, setAddingCall] = useState(false);
  const [noteCategory, setNoteCategory] = useState<string>("Other");
  const [callCategory, setCallCategory] = useState<string>("Other");
  const [noteContent, setNoteContent] = useState("");
  const [callContent, setCallContent] = useState("");

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const loadTimeline = useCallback(
    async (filter: TimelineFilter) => {
      if (!companyId || !clientId) return;
      setTimelineLoading(true);
      setTimelineError(null);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        const data = await getClientTimeline(tenantId, clientId, filter);
        setTimeline(data);
      } catch (err) {
        setTimelineError(
          err instanceof Error ? err.message : "Could not load timeline."
        );
        setTimeline(null);
      } finally {
        setTimelineLoading(false);
      }
    },
    [clientId, companyId]
  );

  const loadClient = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const clientsRaw = await getClients(tenantId);
      const found = clientsRaw.find((c) => String(c.id) === clientId) ?? null;
      if (!found) {
        setClient(null);
        setTimeline(null);
        setError("Client not found.");
        return;
      }
      setClient(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client.");
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadClient();
  }, [companyId, isAuthenticated, isReady, loadClient]);

  useEffect(() => {
    if (!client || companyId === null) return;
    void loadTimeline(timelineFilter);
  }, [timelineFilter, client, companyId, loadTimeline]);

  const refreshAfterAction = useCallback(async () => {
    await loadTimeline(timelineFilter);
  }, [loadTimeline, timelineFilter]);

  const handleAddNote = useCallback(async () => {
    if (!companyId) return;
    const content = noteContent.trim();
    if (!content) return;
    setAddingNote(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "note",
        category: noteCategory,
        content,
      });
      setNoteContent("");
      await refreshAfterAction();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setAddingNote(false);
    }
  }, [clientId, companyId, noteCategory, noteContent, refreshAfterAction]);

  const handleLogCall = useCallback(async () => {
    if (!companyId) return;
    const content = callContent.trim();
    if (!content) return;
    setAddingCall(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "call",
        category: callCategory,
        content,
      });
      setCallContent("");
      await refreshAfterAction();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not log call");
    } finally {
      setAddingCall(false);
    }
  }, [callCategory, callContent, clientId, companyId, refreshAfterAction]);

  const relationshipSince = timeline?.summary.relationship_since
    ? new Date(timeline.summary.relationship_since).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ProtectedRoute>
      <>
        <header className="mb-8">
          <p className="text-sm text-slate-500">Customer</p>
          {loading ? (
            <h1 className="mt-1 text-2xl font-semibold text-slate-400">Loading…</h1>
          ) : client ? (
            <>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                {client.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 text-sm text-slate-600">
                {client.email ? <span>{client.email}</span> : null}
                {client.phone ? <span>{client.phone}</span> : null}
                {relationshipSince ? (
                  <span>Together since {relationshipSince}</span>
                ) : null}
              </div>
            </>
          ) : (
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Client</h1>
          )}
        </header>

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        {client ? (
          <div className="space-y-8">
            <CustomerTimeline
              timeline={timeline}
              loading={timelineLoading || loading}
              error={timelineError}
              activeFilter={timelineFilter}
              onFilterChange={setTimelineFilter}
            />

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">Add to the story</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Notes and calls become part of this relationship history.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm text-slate-700">
                    Note
                    <select
                      value={noteCategory}
                      onChange={(e) => setNoteCategory(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      rows={3}
                      placeholder="What happened?"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleAddNote()}
                    disabled={addingNote || !noteContent.trim()}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    {addingNote ? "Saving…" : "Save note"}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-slate-700">
                    Call
                    <select
                      value={callCategory}
                      onChange={(e) => setCallCategory(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={callContent}
                      onChange={(e) => setCallContent(e.target.value)}
                      rows={3}
                      placeholder="Summary of the conversation"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleLogCall()}
                    disabled={addingCall || !callContent.trim()}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {addingCall ? "Saving…" : "Log call"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-4 text-sm text-slate-600 underline hover:text-slate-900"
              >
                Open pipeline to create a deal
              </button>
            </section>
          </div>
        ) : null}
      </>
    </ProtectedRoute>
  );
}
