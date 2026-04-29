"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Deal } from "@/src/types";

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return null;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DealCardContent({ deal }: { deal: Deal }) {
  const formattedAmount = formatAmount(deal.amount);

  return (
    <>
      <p className="text-sm font-semibold text-gray-900">{deal.title}</p>
      {formattedAmount ? (
        <p className="mt-1 text-xs text-gray-600">{formattedAmount}</p>
      ) : null}
      {deal.client ? (
        <p className="mt-1 text-xs text-gray-500">Клиент: {String(deal.client)}</p>
      ) : null}
    </>
  );
}

export default function DealCard({
  deal,
  index,
  stageId,
  onOpen,
  onDelete,
}: {
  deal: Deal;
  index: number;
  stageId: string;
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `deal-${String(deal.id)}`,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-2 flex gap-1 rounded bg-white shadow"
      {...attributes}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none border-r border-gray-100 px-2 py-3 text-gray-400 hover:bg-gray-50 active:cursor-grabbing"
        {...listeners}
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
          <DealCardContent deal={deal} />
        </button>
        <button
          type="button"
          className="mt-2 text-xs text-red-600 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deal);
          }}
        >
          Удалить
        </button>
      </div>
    </div>
  );
}
