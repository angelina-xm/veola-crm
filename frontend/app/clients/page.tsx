"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import { useAuth } from "@/src/components/auth/AuthProvider";
import PageHeader from "@/src/components/ui/PageHeader";
import ClientModal from "@/src/components/pipeline/ClientModal";
import { createClient, deleteClient, getClients } from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import type { Client } from "@/src/types";

export default function ClientsPage() {
  const { isReady, isAuthenticated, logout } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    const fromLs = getStoredCompanyId();
    setCompanyId(fromLs ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const loadClients = useCallback(async () => {
    if (companyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const list = await getClients(tenantId);
      setClients(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить клиентов");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void loadClients();
  }, [companyId, isAuthenticated, isReady, loadClients]);

  const handleCreateClient = useCallback(
    async (values: {
      name: string;
      email: string;
      client_type?: "business" | "individual";
    }) => {
      if (companyId === null) return;
      setClientSubmitting(true);
      setClientError(null);
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        await createClient(tenantId, {
          name: values.name,
          email: values.email || undefined,
          client_type: values.client_type,
        });
        await loadClients();
        setClientModalOpen(false);
      } catch (err) {
        setClientError(
          err instanceof Error ? err.message : "Не удалось создать клиента"
        );
      } finally {
        setClientSubmitting(false);
      }
    },
    [companyId, loadClients]
  );

  const handleDeleteClient = useCallback(
    async (client: Client) => {
      if (companyId === null) return;
      if (typeof window !== "undefined" && !window.confirm("Are you sure?")) return;
      setDeletingClientId(String(client.id));
      try {
        const tenantId = getStoredCompanyId() ?? companyId;
        await deleteClient(tenantId, client.id);
        await loadClients();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : "Не удалось удалить клиента"
        );
      } finally {
        setDeletingClientId(null);
      }
    },
    [companyId, loadClients]
  );

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Relationships"
          title="Clients"
          description="Persistent accounts and relationship history."
          actions={
            <button
              type="button"
              onClick={() => {
                setClientError(null);
                setClientModalOpen(true);
              }}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
            >
              Add client
            </button>
          }
        />

        {error ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="font-semibold">⚠️ {error}</p>
          </div>
        ) : null}

        <div className="vx-card overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-600">Загрузка клиентов...</div>
          ) : clients.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">No clients yet</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clients.map((client) => (
                <li
                  key={String(client.id)}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/clients/${String(client.id)}`}
                    className="text-sm text-gray-800 hover:underline"
                  >
                    {client.name}
                    {client.email ? ` (${String(client.email)})` : ""}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteClient(client)}
                    disabled={deletingClientId !== null}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingClientId === String(client.id) ? "Deleting..." : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ClientModal
          open={clientModalOpen}
          submitting={clientSubmitting}
          error={clientError}
          onClose={() => {
            if (clientSubmitting) return;
            setClientModalOpen(false);
            setClientError(null);
          }}
          onSubmit={(values) => void handleCreateClient(values)}
        />
      </>
    </ProtectedRoute>
  );
}
