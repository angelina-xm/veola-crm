"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ProductModal, {
  type ProductFormValues,
} from "@/src/components/catalog/ProductModal";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { cn } from "@/src/lib/cn";
import {
  archiveProduct,
  getProductProfile,
  patchProduct,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { formatMoney } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import { relationshipLabel } from "@/src/components/clients/profile/ClientBusinessContext";
import type { ProductProfile } from "@/src/types";

const REL_ORDER = [
  "preferred",
  "frequent",
  "recent",
  "interested",
  "stopped",
];

export default function ProductProfilePage() {
  const { isReady, isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const productId = String(params?.id ?? "");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProductProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const load = useCallback(async () => {
    if (!companyId || !productId) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const data = await getProductProfile(tenantId, productId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, productId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void load();
  }, [companyId, isAuthenticated, isReady, load]);

  const product = profile?.product;

  const handleSave = async (values: ProductFormValues) => {
    if (!companyId || !product) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await patchProduct(tenantId, product.id, {
        name: values.name.trim(),
        product_type: values.product_type,
        category: values.category.trim(),
        description: values.description.trim(),
        sku: values.sku.trim(),
        default_price: values.default_price.trim()
          ? Number.parseFloat(values.default_price)
          : null,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setEditOpen(false);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!companyId || !product) return;
    if (!window.confirm(`Archive "${product.name}"?`)) return;
    const tenantId = getStoredCompanyId() ?? companyId;
    await archiveProduct(tenantId, product.id);
    window.location.href = ROUTES.products;
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6 pb-10">
        <Link
          href={ROUTES.products}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Catalog
        </Link>

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {loading && !profile ? (
          <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
        ) : profile && product ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
              <div className="bg-gradient-to-br from-zinc-50 via-white to-violet-50/20 px-6 py-8 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        product.product_type === "service"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-zinc-100 text-zinc-700"
                      )}
                    >
                      {product.product_type === "service" ? "Service" : "Product"}
                    </span>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                      {product.name}
                    </h1>
                    {product.category ? (
                      <p className="mt-1 text-sm text-zinc-500">{product.category}</p>
                    ) : null}
                    {product.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
                        {product.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.default_price ? (
                        <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          Ref. {formatMoney(Number(product.default_price))}
                        </span>
                      ) : null}
                      {product.sku ? (
                        <span className="text-xs text-zinc-500">SKU {product.sku}</span>
                      ) : null}
                    </div>
                    {product.tags && product.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-zinc-200/80 bg-white px-2 py-0.5 text-[10px] text-zinc-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setEditOpen(true);
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    {product.is_active !== false ? (
                      <button
                        type="button"
                        onClick={() => void handleArchive()}
                        className="rounded-xl border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-50"
                      >
                        Archive
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px border-t border-zinc-100 bg-zinc-100">
                {[
                  {
                    label: "Linked clients",
                    value: String(profile.stats.linked_clients),
                  },
                  {
                    label: "Deals with product",
                    value: String(profile.stats.deals_with_product),
                  },
                  {
                    label: "Recent won (sample)",
                    value: formatMoney(profile.stats.recent_won_revenue),
                  },
                ].map((s) => (
                  <div key={s.label} className="bg-white px-4 py-4 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {s.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Client relationships
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Who buys, who is interested, who stopped
                </p>
                {profile.stats.linked_clients === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    Link this product from a client profile.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {REL_ORDER.map((rel) => {
                      const rows = profile.clients_by_relationship[rel] ?? [];
                      if (rows.length === 0) return null;
                      return (
                        <div key={rel}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            {relationshipLabel(rel)}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {rows.map((row) => (
                              <li key={row.link_id}>
                                <Link
                                  href={`${ROUTES.clients}/${row.client_id}`}
                                  className="text-sm font-medium text-[var(--vx-accent)] hover:underline"
                                >
                                  {row.client_name}
                                </Link>
                                {row.note ? (
                                  <span className="ml-2 text-xs text-zinc-500">
                                    {row.note}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
                <h2 className="text-sm font-semibold text-zinc-900">Recent deals</h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Sales context — not accounting line items
                </p>
                {profile.recent_deals.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">
                    No deals linked yet. Attach products when creating a deal.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-zinc-100">
                    {profile.recent_deals.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{d.title}</p>
                          <p className="text-xs text-zinc-500">
                            {d.client_name} · {d.stage_name}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-zinc-800">
                          {formatMoney(Number(d.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <ProductModal
              open={editOpen}
              submitting={submitting}
              error={modalError}
              initial={product}
              onClose={() => {
                if (submitting) return;
                setEditOpen(false);
                setModalError(null);
              }}
              onSubmit={handleSave}
            />
          </>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
