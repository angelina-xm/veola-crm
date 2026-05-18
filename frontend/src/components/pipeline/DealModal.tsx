"use client";

import { useEffect, useMemo, useState } from "react";
import { getProducts } from "@/src/lib/api";
import type {
  CatalogProduct,
  DealLineItem,
  DealLineItemWrite,
} from "@/src/types";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import { Client, Deal, PipelineStage, StaleDeal } from "@/src/types";
import DealActivitiesTimeline from "./DealActivitiesTimeline";
import DealInactivityPanel from "./DealInactivityPanel";

export type DealModalMode = "create" | "edit";

export interface DealModalProps {
  mode: DealModalMode;
  deal: Deal | null;
  companyId: number;
  stages: PipelineStage[];
  clients: Client[];
  submitting: boolean;
  deletingDeal?: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (values: {
    title: string;
    amount: number;
    stageId: string;
    clientId: string;
    lineItems?: DealLineItemWrite[];
  }) => void | Promise<void>;
  onEdit: (values: {
    title: string;
    amount: number;
    stageId: string;
    lineItems?: DealLineItemWrite[];
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCreateClient?: () => void;
  /** Если сделка в списке GET /deals/stale/ — показать предупреждение */
  staleRow?: StaleDeal | null;
  /** После изменения задач в timeline — обновить карточки/уведомления на доске */
  onActivitiesMutated?: () => void | Promise<void>;
}

function lineItemToWrite(li: DealLineItem): DealLineItemWrite {
  const price =
    li.unit_price == null
      ? null
      : typeof li.unit_price === "string"
        ? Number.parseFloat(li.unit_price)
        : li.unit_price;
  return {
    product_id: li.product_id,
    label: li.label,
    unit_price: Number.isFinite(price as number) ? (price as number) : null,
    quantity: li.quantity,
  };
}

export default function DealModal({
  mode,
  deal,
  companyId,
  stages,
  clients,
  submitting,
  deletingDeal = false,
  error,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  onCreateClient,
  staleRow = null,
  onActivitiesMutated,
}: DealModalProps) {
  const busy = submitting || deletingDeal;
  const firstStageId = stages[0] ? String(stages[0].id) : "";

  const clientsInCompany = useMemo(() => {
    return clients.filter((c) => {
      if (c.company === undefined || c.company === null) return true;
      return String(c.company) === String(companyId);
    });
  }, [clients, companyId]);

  const [title, setTitle] = useState(() =>
    mode === "edit" && deal ? deal.title : ""
  );
  const [amount, setAmount] = useState(() =>
    mode === "edit" && deal && deal.amount != null ? String(deal.amount) : ""
  );
  const [stageId, setStageId] = useState(() =>
    mode === "edit" && deal
      ? String(deal.stageId ?? deal.stage ?? firstStageId)
      : firstStageId
  );
  const [clientId, setClientId] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [pickedProductId, setPickedProductId] = useState("");
  const [lineItems, setLineItems] = useState<DealLineItemWrite[]>([]);

  useEffect(() => {
    void getProducts(companyId)
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [companyId]);

  useEffect(() => {
    if (mode === "edit" && deal?.line_items) {
      setLineItems(deal.line_items.map(lineItemToWrite));
      return;
    }
    if (mode === "create") {
      setLineItems([]);
    }
  }, [mode, deal]);

  useEffect(() => {
    if (mode === "edit" && deal) {
      setStageId(String(deal.stageId ?? deal.stage ?? firstStageId));
      return;
    }
    setStageId((prev) => {
      if (!prev) return firstStageId;
      const stillExists = stages.some((s) => String(s.id) === prev);
      return stillExists ? prev : firstStageId;
    });
  }, [mode, deal, firstStageId, stages]);

  useEffect(() => {
    if (mode !== "create") return;
    setClientId((prev) => {
      const allowed = new Set(clientsInCompany.map((c) => String(c.id)));
      if (prev && allowed.has(prev)) return prev;
      return clientsInCompany[0] ? String(clientsInCompany[0].id) : "";
    });
  }, [mode, clientsInCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number.parseFloat(amount.replace(",", "."));
    if (!title.trim()) return;
    const amountOk = Number.isFinite(amountNum);
    if (!amountOk && lineItems.length === 0) return;

    if (mode === "create") {
      if (!stageId || !clientId) return;
      const allowedIds = new Set(clientsInCompany.map((c) => String(c.id)));
      if (!allowedIds.has(clientId)) return;
      await onCreate({
        title: title.trim(),
        amount: amountOk ? amountNum : 0,
        stageId,
        clientId,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
      });
    } else if (deal) {
      const syncLineItems =
        deal.line_items !== undefined ||
        lineItems.length > 0 ||
        catalog.length > 0;
      await onEdit({
        title: title.trim(),
        amount: amountNum,
        stageId,
        ...(syncLineItems ? { lineItems } : {}),
      });
    }
  };

  const titleText =
    mode === "create" ? "Новая сделка" : "Редактировать сделку";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-modal-title"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget && !busy) onClose();
      }}
    >
      <div
        className={`w-full rounded-lg bg-white p-6 shadow-xl ${
          mode === "edit" ? "max-w-3xl" : "max-w-md"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="deal-modal-title" className="text-lg font-semibold text-gray-900">
              {titleText}
            </h2>
            {mode === "edit" && deal ? (
              <div className="mt-1 space-y-0.5 text-sm">
                <p className="text-gray-900">
                  <span className="font-semibold">{deal.title}</span>{" "}
                  <span className="font-normal text-gray-500">
                    ({formatDealIdLabel(deal.id)})
                  </span>
                </p>
                {deal.client != null ? (
                  <p className="text-xs text-gray-600">
                    Client:{" "}
                    {clientNameById(clients, deal.client) ?? String(deal.client)}
                  </p>
                ) : null}
                {deal.created_at ? (
                  <p className="text-xs text-gray-500">
                    Created: {formatCreatedRelative(deal.created_at)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="deal-title" className="mb-1 block text-sm font-medium text-gray-700">
              Название
            </label>
            <input
              id="deal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              required
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="deal-amount" className="mb-1 block text-sm font-medium text-gray-700">
              Сумма
            </label>
            <input
              id="deal-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              required
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="deal-stage" className="mb-1 block text-sm font-medium text-gray-700">
              Этап
            </label>
            <select
              id="deal-stage"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              disabled={busy || stages.length === 0}
              required
            >
              {stages.length === 0 ? (
                <option value="">Нет доступных стадий</option>
              ) : (
                stages.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
            {stages.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                Добавьте стадии воронки для текущей компании, затем повторите
                создание сделки.
              </p>
            ) : null}
          </div>

          {mode === "create" ? (
            <div>
              <label htmlFor="deal-client" className="mb-1 block text-sm font-medium text-gray-700">
                Клиент
              </label>
              <select
                id="deal-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                disabled={busy || clientsInCompany.length === 0}
                required
              >
                {clientsInCompany.length === 0 ? (
                  <option value="">Нет клиентов в компании</option>
                ) : (
                  clientsInCompany.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {clientsInCompany.length === 0 ? (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-xs text-amber-700">Нет клиентов в компании.</p>
                  <button
                    type="button"
                    onClick={onCreateClient}
                    disabled={busy}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
                  >
                    Create client
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {catalog.length > 0 || lineItems.length > 0 ? (
            <div className="rounded border border-gray-200 bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-700">
                Products (optional)
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Sales context from catalog — not invoicing
              </p>
              <div className="mt-2 flex gap-2">
                <select
                  value={pickedProductId}
                  onChange={(e) => setPickedProductId(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                  disabled={busy}
                >
                  <option value="">Add product…</option>
                  {catalog
                    .filter(
                      (p) => !lineItems.some((li) => li.product_id === p.id)
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !pickedProductId}
                  onClick={() => {
                    const p = catalog.find(
                      (x) => String(x.id) === pickedProductId
                    );
                    if (!p) return;
                    setLineItems((prev) => [
                      ...prev,
                      {
                        product_id: p.id,
                        label: p.name,
                        unit_price: p.default_price
                          ? Number(p.default_price)
                          : null,
                        quantity: 1,
                      },
                    ]);
                    setPickedProductId("");
                  }}
                  className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium"
                >
                  Add
                </button>
              </div>
              {lineItems.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {lineItems.map((li, idx) => (
                    <li
                      key={`${li.product_id}-${idx}`}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="flex-1 font-medium text-gray-800">
                        {li.label}
                      </span>
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        className="w-14 rounded border border-gray-300 px-1.5 py-1"
                        value={li.quantity ?? 1}
                        onChange={(e) => {
                          const qty = Number.parseInt(e.target.value, 10);
                          setLineItems((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    quantity:
                                      Number.isFinite(qty) && qty > 0
                                        ? qty
                                        : 1,
                                  }
                                : row
                            )
                          );
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        className="w-24 rounded border border-gray-300 px-1.5 py-1"
                        value={
                          li.unit_price == null ? "" : String(li.unit_price)
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setLineItems((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? {
                                    ...row,
                                    unit_price: v
                                      ? Number.parseFloat(v)
                                      : null,
                                  }
                                : row
                            )
                          );
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setLineItems((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={
                busy ||
                stages.length === 0 ||
                !stageId ||
                (mode === "create" && clientsInCompany.length === 0)
              }
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Loading..." : mode === "create" ? "Создать" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={busy}
                className="ml-auto rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingDeal ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>
        </form>

        {mode === "edit" && deal ? (
          <DealInactivityPanel
            companyId={companyId}
            deal={deal}
            staleRow={staleRow}
            disabled={busy}
            onMutated={onActivitiesMutated}
          />
        ) : null}

        {mode === "edit" && deal ? (
          <DealActivitiesTimeline
            companyId={companyId}
            dealId={deal.id}
            disabled={busy}
            onTasksChanged={onActivitiesMutated}
          />
        ) : null}
      </div>
    </div>
  );
}
