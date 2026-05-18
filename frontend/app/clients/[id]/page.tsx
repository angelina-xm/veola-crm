"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import CustomerTimeline from "@/src/components/clients/CustomerTimeline";
import ClientAnalyticsPro from "@/src/components/clients/profile/ClientAnalyticsPro";
import ClientContactsSection from "@/src/components/clients/profile/ClientContactsSection";
import ClientCurrentState from "@/src/components/clients/profile/ClientCurrentState";
import ClientMetricsSnapshot from "@/src/components/clients/profile/ClientMetricsSnapshot";
import ClientProfileHero from "@/src/components/clients/profile/ClientProfileHero";
import ClientQuickActions from "@/src/components/clients/profile/ClientQuickActions";
import ClientRelationshipMemoryBlock from "@/src/components/clients/profile/ClientRelationshipMemory";
import {
  createActivity,
  createClientContact,
  createCrmTask,
  deleteClientContact,
  getClientProfile,
  getClientTimeline,
  patchClient,
  patchClientContact,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { ROUTES } from "@/src/lib/product";
import { defaultDueDatetimeLocal } from "@/src/lib/taskSemantics";
import type {
  ClientContact,
  ClientProfile,
  ClientRelationshipMemory,
  TimelineFilter,
} from "@/src/types";

const NOTE_CATEGORIES = ["Pricing", "Interest", "Objection", "Follow up", "Other"];

export default function ClientProfilePage() {
  const { isReady, isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const clientId = String(params?.id ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [timeline, setTimeline] = useState<
    Awaited<ReturnType<typeof getClientTimeline>> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const noteRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<HTMLDivElement>(null);
  const [noteContent, setNoteContent] = useState("");
  const [callContent, setCallContent] = useState("");
  const [noteCategory, setNoteCategory] = useState("Other");
  const [actionBusy, setActionBusy] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const loadProfile = useCallback(async () => {
    if (!companyId || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const data = await getClientProfile(tenantId, clientId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  const loadTimeline = useCallback(
    async (filter: TimelineFilter) => {
      if (!companyId || !clientId) return;
      setTimelineLoading(true);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        const data = await getClientTimeline(tenantId, clientId, filter);
        setTimeline(data);
      } catch {
        setTimeline(null);
      } finally {
        setTimelineLoading(false);
      }
    },
    [clientId, companyId]
  );

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadProfile();
  }, [companyId, isAuthenticated, isReady, loadProfile]);

  useEffect(() => {
    if (!profile) return;
    void loadTimeline(timelineFilter);
  }, [profile, timelineFilter, loadTimeline]);

  const refresh = useCallback(async () => {
    await loadProfile();
    await loadTimeline(timelineFilter);
  }, [loadProfile, loadTimeline, timelineFilter]);

  const saveMemory = async (memory: ClientRelationshipMemory) => {
    if (!companyId) return;
    const tenantId = getStoredCompanyId() ?? companyId;
    await patchClient(tenantId, clientId, {
      ...memory,
      last_conversation_at: new Date().toISOString(),
    });
    await refresh();
  };

  const saveContact = async (
    payload: Omit<ClientContact, "id"> & { id?: number }
  ) => {
    if (!companyId) return;
    const tenantId = getStoredCompanyId() ?? companyId;
    if (payload.id) {
      await patchClientContact(tenantId, clientId, payload.id, payload);
    } else {
      await createClientContact(tenantId, clientId, payload);
    }
    await refresh();
  };

  const removeContact = async (id: number) => {
    if (!companyId) return;
    const tenantId = getStoredCompanyId() ?? companyId;
    await deleteClientContact(tenantId, clientId, id);
    await refresh();
  };

  const addNote = async () => {
    if (!companyId || !noteContent.trim()) return;
    setActionBusy(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "note",
        category: noteCategory,
        content: noteContent.trim(),
      });
      setNoteContent("");
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const logCall = async () => {
    if (!companyId || !callContent.trim()) return;
    setActionBusy(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createActivity(tenantId, {
        client: Number.parseInt(clientId, 10),
        type: "call",
        category: "Follow up",
        content: callContent.trim(),
      });
      setCallContent("");
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const addTask = async () => {
    if (!companyId) return;
    setActionBusy(true);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await createCrmTask(tenantId, {
        client: Number.parseInt(clientId, 10),
        content: "Follow up with client",
        due_date: new Date(defaultDueDatetimeLocal()).toISOString(),
        priority: "medium",
      });
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const noteForm = (
    <div className="grid gap-4 md:grid-cols-2">
      <div ref={noteRef}>
        <p className="text-xs font-semibold text-zinc-700">Add note</p>
        <select
          value={noteCategory}
          onChange={(e) => setNoteCategory(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
        >
          {NOTE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="What happened?"
        />
        <button
          type="button"
          disabled={actionBusy || !noteContent.trim()}
          onClick={() => void addNote()}
          className="mt-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          Save note
        </button>
      </div>
      <div ref={callRef}>
        <p className="text-xs font-semibold text-zinc-700">Log call</p>
        <textarea
          value={callContent}
          onChange={(e) => setCallContent(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Conversation summary"
        />
        <button
          type="button"
          disabled={actionBusy || !callContent.trim()}
          onClick={() => void logCall()}
          className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-50"
        >
          Log call
        </button>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <Link
          href={ROUTES.clients}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Clients
        </Link>

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {loading && !profile ? (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
        ) : profile ? (
          <>
            <ClientProfileHero
              client={profile.client}
              primaryContact={profile.primary_contact}
            />
            <ClientQuickActions
              clientId={clientId}
              hasPrimaryContact={profile.has_primary_contact}
              onAddNote={() => noteRef.current?.scrollIntoView({ behavior: "smooth" })}
              onLogCall={() => callRef.current?.scrollIntoView({ behavior: "smooth" })}
              onAddTask={() => void addTask()}
            />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <ClientCurrentState
                  deals={profile.operational.active_deals}
                  tasks={profile.operational.open_tasks}
                />
                <ClientContactsSection
                  contacts={profile.contacts}
                  onSave={saveContact}
                  onDelete={removeContact}
                />
                <CustomerTimeline
                  timeline={timeline}
                  loading={timelineLoading}
                  activeFilter={timelineFilter}
                  onFilterChange={setTimelineFilter}
                  noteForm={noteForm}
                />
              </div>
              <div className="space-y-6">
                <ClientMetricsSnapshot metrics={profile.metrics} />
                <ClientRelationshipMemoryBlock
                  memory={profile.relationship_memory}
                  onSave={saveMemory}
                />
                <ClientAnalyticsPro />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
