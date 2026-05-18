"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { relationshipLabel } from "./ClientBusinessContext";
import { formatMoney } from "@/src/lib/formatRelative";
import type {
  CatalogProduct,
  ClientProductLink,
  ClientProductRelationship,
} from "@/src/types";

const REL_OPTIONS: { value: ClientProductRelationship; label: string }[] = [
  { value: "preferred", label: "Preferred" },
  { value: "frequent", label: "Frequently buys" },
  { value: "recent", label: "Recently ordered" },
  { value: "interested", label: "Interested in" },
  { value: "stopped", label: "Stopped ordering" },
];

export default function ClientProductsSection({
  links,
  catalog,
  onLink,
  onUnlink,
  onCreateProduct,
}: {
  links: ClientProductLink[];
  catalog: CatalogProduct[];
  onLink: (
    productId: number,
    relationship: ClientProductRelationship
  ) => Promise<void>;
  onUnlink: (linkId: number) => Promise<void>;
  onCreateProduct: (name: string, category?: string) => Promise<CatalogProduct>;
}) {
  const [adding, setAdding] = useState(false);
  const [productId, setProductId] = useState("");
  const [relationship, setRelationship] =
    useState<ClientProductRelationship>("preferred");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const linkedIds = useMemo(
    () => new Set(links.map((l) => l.product.id)),
    [links]
  );
  const available = catalog.filter((p) => !linkedIds.has(p.id));

  const submitLink = async () => {
    if (!productId) return;
    setBusy(true);
    try {
      await onLink(Number.parseInt(productId, 10), relationship);
      setProductId("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  const submitNew = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const p = await onCreateProduct(newName.trim());
      await onLink(p.id, relationship);
      setNewName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[var(--vx-shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Preferred & typical products
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            What they buy, want, or stopped ordering — from your{" "}
            <a href="/products" className="font-medium text-[var(--vx-accent)] hover:underline">
              catalog
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-[11px] font-medium text-[var(--vx-accent)] hover:underline"
        >
          {adding ? "Close" : "+ Link product"}
        </button>
      </div>

      {links.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No products linked yet. Tie catalog items to this relationship.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="group flex max-w-full items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/products/${link.product.id}`}
                  className="truncate text-sm font-medium text-zinc-900 hover:text-[var(--vx-accent)]"
                >
                  {link.product.name}
                </Link>
                <p className="text-[10px] text-zinc-500">
                  {relationshipLabel(link.relationship)}
                  {link.product.category ? ` · ${link.product.category}` : ""}
                  {link.product.default_price
                    ? ` · from ${formatMoney(Number(link.product.default_price))}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onUnlink(link.id)}
                className="shrink-0 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                aria-label="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-4 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/40 p-3">
          <select
            value={relationship}
            onChange={(e) =>
              setRelationship(e.target.value as ClientProductRelationship)
            }
            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          >
            {REL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {available.length > 0 ? (
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            >
              <option value="">Select from catalog…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.category ? ` (${p.category})` : ""}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex gap-2">
            {available.length > 0 ? (
              <button
                type="button"
                disabled={busy || !productId}
                onClick={() => void submitLink()}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Link
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-500">Or add to catalog:</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Product name"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || !newName.trim()}
            onClick={() => void submitNew()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:opacity-50"
          >
            Create & link
          </button>
        </div>
      ) : null}
    </section>
  );
}
