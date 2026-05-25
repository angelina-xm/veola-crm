"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct, CatalogProductType } from "@/src/types";
import { useTranslation } from "@/src/context/LocaleContext";

export type ProductFormValues = {
  name: string;
  product_type: CatalogProductType;
  category: string;
  description: string;
  sku: string;
  default_price: string;
  tags: string;
};

type Props = {
  open: boolean;
  submitting: boolean;
  error: string | null;
  initial?: CatalogProduct | null;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
};

const empty: ProductFormValues = {
  name: "",
  product_type: "physical",
  category: "",
  description: "",
  sku: "",
  default_price: "",
  tags: "",
};

export default function ProductModal({
  open,
  submitting,
  error,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProductFormValues>(empty);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        product_type: initial.product_type ?? "physical",
        category: initial.category ?? "",
        description: initial.description ?? "",
        sku: initial.sku ?? "",
        default_price: initial.default_price ?? "",
        tags: (initial.tags ?? []).join(", "),
      });
    } else {
      setForm(empty);
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          {initial ? t("catalog.editProduct") : t("catalog.addToCatalog")}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">{t("catalog.modalHintRefPrice")}</p>

        {error ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(form);
          }}
        >
          <label className="block text-xs font-medium text-zinc-600">
            {t("catalog.productNameLabel")}
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              disabled={submitting}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-zinc-600">
              {t("catalog.typeLabel")}
              <select
                value={form.product_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    product_type: e.target.value as CatalogProductType,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
                disabled={submitting}
              >
                <option value="physical">{t("catalog.physical")}</option>
                <option value="service">{t("catalog.service")}</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              {t("catalog.categoryLabel")}
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                disabled={submitting}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            {t("catalog.descriptionLabel")}
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              disabled={submitting}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-zinc-600">
              {t("catalog.skuArticle")}
              <input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                disabled={submitting}
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              {t("catalog.referencePrice")}
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.default_price}
                onChange={(e) =>
                  setForm({ ...form, default_price: e.target.value })
                }
                placeholder={t("catalog.optional")}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                disabled={submitting}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-zinc-600">
            {t("catalog.tagsLabel")}
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              disabled={submitting}
            />
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || !form.name.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? t("common.saving") : initial ? t("common.save") : t("common.create")}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
