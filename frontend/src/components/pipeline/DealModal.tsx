"use client";

import { useState } from "react";
import { Client, Deal, PipelineStage } from "@/src/types";

export type DealModalMode = "create" | "edit";

export interface DealModalProps {
  mode: DealModalMode;
  deal: Deal | null;
  stages: PipelineStage[];
  clients: Client[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onCreate: (values: {
    title: string;
    amount: number;
    stageId: string;
    clientId: string;
  }) => void | Promise<void>;
  onEdit: (values: {
    title: string;
    amount: number;
    stageId: string;
  }) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export default function DealModal({
  mode,
  deal,
  stages,
  clients,
  submitting,
  error,
  onClose,
  onCreate,
  onEdit,
  onDelete,
}: DealModalProps) {
  const firstStageId = stages[0] ? String(stages[0].id) : "";

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
  const [clientId, setClientId] = useState(() =>
    clients[0] ? String(clients[0].id) : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number.parseFloat(amount.replace(",", "."));
    if (!title.trim()) return;
    if (!Number.isFinite(amountNum)) return;

    if (mode === "create") {
      if (!stageId || !clientId) return;
      await onCreate({
        title: title.trim(),
        amount: amountNum,
        stageId,
        clientId,
      });
    } else if (deal) {
      await onEdit({
        title: title.trim(),
        amount: amountNum,
        stageId,
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
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="deal-modal-title" className="text-lg font-semibold text-gray-900">
            {titleText}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
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
              disabled={submitting}
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
              disabled={submitting}
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
              disabled={submitting}
            >
              {stages.map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
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
                disabled={submitting || clients.length === 0}
                required
              >
                {clients.length === 0 ? (
                  <option value="">Нет клиентов в компании</option>
                ) : (
                  clients.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {clients.length === 0 ? (
                <p className="mt-1 text-xs text-amber-700">
                  Добавьте клиента через API или админку, затем обновите страницу.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={
                submitting ||
                (mode === "create" && clients.length === 0)
              }
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Сохранение…" : mode === "create" ? "Создать" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
            {mode === "edit" && onDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={submitting}
                className="ml-auto rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Удалить
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
