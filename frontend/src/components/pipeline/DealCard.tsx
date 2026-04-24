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
}: {
  deal: Deal;
  index: number;
  stageId: string;
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
      {...attributes}
      {...listeners}
      className="bg-white p-3 mb-2 rounded shadow cursor-grab"
    >
      <DealCardContent deal={deal} />
    </div>
  );
}