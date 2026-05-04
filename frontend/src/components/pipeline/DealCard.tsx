"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  clientNameById,
  formatCreatedRelative,
  formatDealAmountUsd,
  formatDealIdLabel,
} from "@/src/lib/dealDisplay";
import { getDealTaskSignal, type DealTaskSignal } from "@/src/lib/dealTaskSignal";
import { Activity, Client, Deal } from "@/src/types";

export function DealCardContent({
  deal,
  clients = [],
  openTasksForDeal = [],
  taskSignal: taskSignalProp,
}: {
  deal: Deal;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  taskSignal?: DealTaskSignal;
}) {
  const formattedAmount = formatDealAmountUsd(deal.amount);
  const clientLabel = clientNameById(clients, deal.client);
  const clientLine =
    clientLabel ??
    (deal.client != null && deal.client !== ""
      ? String(deal.client)
      : "—");
  const taskSignal = taskSignalProp ?? getDealTaskSignal(openTasksForDeal);

  return (
    <>
      <p className="text-sm font-semibold text-gray-900">
        {deal.title}{" "}
        <span className="font-normal text-gray-500">
          ({formatDealIdLabel(deal.id)})
        </span>
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Client: {clientLine}
      </p>
      {formattedAmount ? (
        <p className="mt-0.5 text-sm font-medium text-gray-900">
          {formattedAmount}
        </p>
      ) : null}
      <p className={`mt-1 text-xs font-medium ${taskSignal.textClass}`}>
        {taskSignal.text}
      </p>
      {deal.created_at ? (
        <p className="mt-1 text-xs text-gray-500">
          Created: {formatCreatedRelative(deal.created_at)}
        </p>
      ) : null}
    </>
  );
}

export default function DealCard({
  deal,
  index,
  stageId,
  isDeleting = false,
  deleteDisabled = false,
  dragDisabled = false,
  clients = [],
  onOpen,
  onDelete,
  openTasksForDeal = [],
  spotlight = false,
  dimmed = false,
  onQuickCompleteFirstTask,
  quickCompleting = false,
  onQuickAddTask,
  quickAddingTask = false,
}: {
  deal: Deal;
  index: number;
  stageId: string;
  clients?: Client[];
  openTasksForDeal?: Activity[];
  spotlight?: boolean;
  dimmed?: boolean;
  onQuickCompleteFirstTask?: () => void | Promise<void>;
  quickCompleting?: boolean;
  onQuickAddTask?: () => void | Promise<void>;
  quickAddingTask?: boolean;
  isDeleting?: boolean;
  deleteDisabled?: boolean;
  dragDisabled?: boolean;
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}) {
  const taskSignal = getDealTaskSignal(openTasksForDeal);
  const hasOpenTask = openTasksForDeal.some(
    (t) => t.type === "task" && !t.is_completed
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `deal-${String(deal.id)}`,
    disabled: dragDisabled,
    data: {
      stageId,
      index,
      dealId: String(deal.id),
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const focusRing =
    spotlight && !dimmed
      ? "ring-2 ring-blue-500 ring-offset-1 bg-blue-50/60"
      : "";
  const dimClass = dimmed ? "opacity-40" : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 flex gap-1 overflow-hidden rounded bg-white shadow ${taskSignal.borderClass} ${focusRing} ${dimClass}`}
      {...attributes}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none border-r border-gray-100 px-2 py-3 text-gray-400 hover:bg-gray-50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        {...listeners}
        disabled={dragDisabled}
        aria-label="Перетащить"
      >
        ⋮⋮
      </button>
      <div className="min-w-0 flex-1 py-2 pr-2">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onOpen(deal)}
        >
          <DealCardContent
            deal={deal}
            clients={clients}
            openTasksForDeal={openTasksForDeal}
            taskSignal={taskSignal}
          />
        </button>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {onQuickAddTask ? (
            <button
              type="button"
              className="cursor-pointer rounded border border-sky-500 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={quickAddingTask || deleteDisabled}
              onClick={(e) => {
                e.stopPropagation();
                void onQuickAddTask();
              }}
            >
              {quickAddingTask ? "…" : "➕ Add task"}
            </button>
          ) : null}
          {hasOpenTask && onQuickCompleteFirstTask ? (
            <button
              type="button"
              className="cursor-pointer rounded border border-emerald-600 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={quickCompleting || deleteDisabled}
              onClick={(e) => {
                e.stopPropagation();
                void onQuickCompleteFirstTask();
              }}
            >
              {quickCompleting ? "…" : "✔ Complete"}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-red-600 hover:underline disabled:opacity-50"
          disabled={deleteDisabled}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deal);
          }}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
