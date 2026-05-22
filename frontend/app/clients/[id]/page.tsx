"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import CustomerTimeline from "@/src/components/clients/CustomerTimeline";
import ClientRelationshipMemoryCard from "@/src/components/clients/profile/ClientRelationshipMemoryCard";
import ClientRelationshipIntelligenceCard from "@/src/components/clients/profile/ClientRelationshipIntelligenceCard";
import ClientRelationshipStatusSelect from "@/src/components/clients/profile/ClientRelationshipStatusSelect";
import ClientProfileInsightsLink from "@/src/components/clients/profile/ClientProfileInsightsLink";
import ClientBusinessContextPanel from "@/src/components/clients/profile/ClientBusinessContext";
import ClientContactsSection from "@/src/components/clients/profile/ClientContactsSection";
import ClientCurrentState from "@/src/components/clients/profile/ClientCurrentState";
import ClientInteractionHub from "@/src/components/clients/profile/ClientInteractionHub";
import ClientMetricsStrip from "@/src/components/clients/profile/ClientMetricsStrip";
import ClientProductsSection from "@/src/components/clients/profile/ClientProductsSection";
import ClientProfileHero from "@/src/components/clients/profile/ClientProfileHero";
import ClientQuickActions from "@/src/components/clients/profile/ClientQuickActions";
import {
  createClientContact,
  createCrmTask,
  createProduct,
  deleteClientContact,
  getClientProfile,
  getClientTimeline,
  getProducts,
  linkClientProduct,
  patchClient,
  patchClientContact,
  postClientInteraction,
  unlinkClientProduct,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { ROUTES } from "@/src/lib/product";
import { defaultDueDatetimeLocal } from "@/src/lib/taskSemantics";
import type {
  CatalogProduct,
  ClientBusinessContext,
  ClientContact,
  ClientInteractionType,
  ClientProductRelationship,
  ClientProfile,
  ClientRelationshipMemory,
  ClientRelationshipStatus,
  TimelineFilter,
} from "@/src/types";

export default function ClientProfilePage() {
  const { isReady, isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const clientId = String(params?.id ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [timeline, setTimeline] = useState<
    Awaited<ReturnType<typeof getClientTimeline>> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [contextEditing, setContextEditing] = useState(false);
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
      const [data, products] = await Promise.all([
        getClientProfile(tenantId, clientId),
        getProducts(tenantId).catch(() => [] as CatalogProduct[]),
      ]);
      setProfile(data);
      setCatalog(products);
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

  const tenantId = companyId ? getStoredCompanyId() ?? companyId : null;

  const saveBusinessContext = async (patch: Partial<ClientBusinessContext>) => {
    if (!tenantId) return;
    await patchClient(tenantId, clientId, patch);
    setContextEditing(false);
    await refresh();
  };

  const saveMemory = async (memory: ClientRelationshipMemory) => {
    if (!tenantId) return;
    await patchClient(tenantId, clientId, memory);
    await refresh();
  };

  const saveContact = async (
    payload: Omit<ClientContact, "id"> & { id?: number }
  ) => {
    if (!tenantId) return;
    if (payload.id) {
      await patchClientContact(tenantId, clientId, payload.id, payload);
    } else {
      await createClientContact(tenantId, clientId, payload);
    }
    await refresh();
  };

  const removeContact = async (id: number) => {
    if (!tenantId) return;
    await deleteClientContact(tenantId, clientId, id);
    await refresh();
  };

  const submitInteraction = async (payload: {
    interaction_type: ClientInteractionType;
    content: string;
    category: string;
    topic: string;
    mood: string;
    outcome: string;
    next_step: string;
    concerns: string;
    relationship_context: string;
    follow_up_on: string | null;
    schedule_follow_up: boolean;
    follow_up_due: string | null;
  }) => {
    if (!tenantId) return;
    setActionBusy(true);
    try {
      await postClientInteraction(tenantId, clientId, payload);
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const addTask = async () => {
    if (!tenantId) return;
    setActionBusy(true);
    try {
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
            >
              <ClientBusinessContextPanel
                context={profile.business_context}
                metricsStrip={<ClientMetricsStrip metrics={profile.metrics} />}
                editing={contextEditing}
                onStartEdit={() => setContextEditing(true)}
                onSave={saveBusinessContext}
                onCancel={() => setContextEditing(false)}
              />
            </ClientProfileHero>

            <ClientQuickActions
              clientId={clientId}
              hasPrimaryContact={profile.has_primary_contact}
              onAddInteraction={() => setInteractionOpen(true)}
              onAddTask={() => void addTask()}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <ClientCurrentState
                  deals={profile.operational.active_deals}
                  tasks={profile.operational.open_tasks}
                />
                {interactionOpen ? (
                  <ClientInteractionHub
                    open
                    onOpenChange={setInteractionOpen}
                    busy={actionBusy}
                    onSubmit={submitInteraction}
                  />
                ) : null}
                <ClientRelationshipMemoryCard
                  memory={profile.relationship_memory}
                  onSave={saveMemory}
                  interactionFormOpen={interactionOpen}
                />
                <ClientProductsSection
                  links={profile.products}
                  catalog={catalog}
                  onLink={async (productId, relationship) => {
                    if (!tenantId) return;
                    await linkClientProduct(tenantId, clientId, {
                      product_id: productId,
                      relationship,
                    });
                    await refresh();
                  }}
                  onUnlink={async (linkId) => {
                    if (!tenantId) return;
                    await unlinkClientProduct(tenantId, clientId, linkId);
                    await refresh();
                  }}
                  onCreateProduct={async (name, category) => {
                    if (!tenantId) throw new Error("No tenant");
                    const p = await createProduct(tenantId, { name, category });
                    setCatalog((prev) => [...prev, p]);
                    return p;
                  }}
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
                />
              </div>
              <div className="space-y-6">
                {profile.relationship_intelligence ? (
                  <ClientRelationshipIntelligenceCard
                    intelligence={profile.relationship_intelligence}
                  />
                ) : null}
                <ClientRelationshipStatusSelect
                  value={
                    (profile.client.relationship_status ??
                      "active") as ClientRelationshipStatus
                  }
                  onChange={async (relationship_status) => {
                    if (!tenantId) return;
                    await patchClient(tenantId, clientId, { relationship_status });
                    await refresh();
                  }}
                />
                <ClientProfileInsightsLink
                  clientId={clientId}
                  metrics={profile.metrics}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
