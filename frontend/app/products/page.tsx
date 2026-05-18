"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import ProductModal, {
  type ProductFormValues,
} from "@/src/components/catalog/ProductModal";
import PageHeader from "@/src/components/ui/PageHeader";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { cn } from "@/src/lib/cn";
import {
  archiveProduct,
  createProduct,
  getProducts,
  patchProduct,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { formatMoney } from "@/src/lib/formatRelative";
import { ROUTES } from "@/src/lib/product";
import type { CatalogProduct } from "@/src/types";

function ProductCatalogCard({ product }: { product: CatalogProduct }) {
  const isService = product.product_type === "service";
  return (
    <Link
      href={`${ROUTES.products}/${product.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)] transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isService
              ? "bg-violet-50 text-violet-700"
              : "bg-zinc-100 text-zinc-600"
          )}
        >
          {isService ? "Service" : "Product"}
        </span>
        {!product.is_active ? (
          <span className="text-[10px] font-medium text-zinc-400">Archived</span>
        ) : null}
      </div>
      <h3 className="mt-3 text-base font-semibold text-zinc-900 group-hover:text-[var(--vx-accent)]">
        {product.name}
      </h3>
      {product.category ? (
        <p className="mt-1 text-xs text-zinc-500">{product.category}</p>
      ) : null}
      {product.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">
          {product.description}
        </p>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">No description yet</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        {product.default_price ? (
          <span className="text-xs text-zinc-500">
            Ref. {formatMoney(Number(product.default_price))}
          </span>
        ) : (
          <span className="text-xs text-zinc-400">Flexible pricing</span>
        )}
        {product.sku ? (
          <span className="text-[10px] text-zinc-400">SKU {product.sku}</span>
        ) : null}
      </div>
      {product.tags && product.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {product.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

export default function ProductsCatalogPage() {
  const { isReady, isAuthenticated } = useAuth();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "physical" | "service">(
    "all"
  );
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  const load = useCallback(async () => {
    if (companyId === null) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const list = await getProducts(tenantId, { includeInactive: showArchived });
      setProducts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, showArchived]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null) return;
    void load();
  }, [companyId, isAuthenticated, isReady, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== "all" && p.product_type !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        p.name,
        p.category,
        p.description,
        p.sku,
        ...(p.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, search, typeFilter]);

  const parseForm = (values: ProductFormValues) => ({
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

  const handleSubmit = async (values: ProductFormValues) => {
    if (companyId === null) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const body = parseForm(values);
      if (editing) {
        await patchProduct(tenantId, editing.id, body);
      } else {
        await createProduct(tenantId, body);
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <>
        <PageHeader
          eyebrow="Commercial context"
          title="Catalog"
          description="What your business sells — relationship intelligence, not inventory."
          actions={
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalError(null);
                setModalOpen(true);
              }}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
            >
              Add product
            </button>
          }
        />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            placeholder="Search catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-sm shadow-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "physical", "service"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium capitalize",
                  typeFilter === t
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                )}
              >
                {t === "all" ? "All" : t}
              </button>
            ))}
            <label className="ml-2 flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-800">No products yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Build your catalog so deals and client profiles understand what you sell.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCatalogCard key={p.id} product={p} />
            ))}
          </div>
        )}

        <ProductModal
          open={modalOpen}
          submitting={submitting}
          error={modalError}
          initial={editing}
          onClose={() => {
            if (submitting) return;
            setModalOpen(false);
            setEditing(null);
            setModalError(null);
          }}
          onSubmit={handleSubmit}
        />
      </>
    </ProtectedRoute>
  );
}
