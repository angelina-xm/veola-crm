"use client";

import type { TeamMember } from "@/src/lib/api";

export type AssigneeChoice =
  | { type: "me" }
  | { type: "deal_owner" }
  | { type: "member"; userId: number };

type Props = {
  members: TeamMember[];
  currentUserId: number;
  dealOwnerUserId?: number | null;
  value: AssigneeChoice;
  onChange: (value: AssigneeChoice) => void;
  disabled?: boolean;
};

function choiceValue(c: AssigneeChoice): string {
  if (c.type === "me") return "me";
  if (c.type === "deal_owner") return "deal_owner";
  return `member:${c.userId}`;
}

function parseChoice(raw: string, members: TeamMember[]): AssigneeChoice {
  if (raw === "me") return { type: "me" };
  if (raw === "deal_owner") return { type: "deal_owner" };
  if (raw.startsWith("member:")) {
    const id = Number.parseInt(raw.slice(7), 10);
    if (Number.isFinite(id)) return { type: "member", userId: id };
  }
  const first = members[0];
  return first
    ? { type: "member", userId: first.user_id }
    : { type: "me" };
}

export function resolveAssigneeUserId(
  choice: AssigneeChoice,
  currentUserId: number,
  dealOwnerUserId?: number | null
): number {
  if (choice.type === "me") return currentUserId;
  if (choice.type === "deal_owner" && dealOwnerUserId != null) {
    return dealOwnerUserId;
  }
  if (choice.type === "member") return choice.userId;
  return currentUserId;
}

export default function TaskAssigneeSelect({
  members,
  currentUserId,
  dealOwnerUserId,
  value,
  onChange,
  disabled,
}: Props) {
  const activeMembers = members.filter((m) => m.is_active);
  const dealOwnerMember = dealOwnerUserId
    ? activeMembers.find((m) => m.user_id === dealOwnerUserId)
    : undefined;

  return (
    <label className="block text-xs font-medium text-zinc-600">
      Assign to
      <select
        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        value={choiceValue(value)}
        disabled={disabled}
        onChange={(e) => onChange(parseChoice(e.target.value, activeMembers))}
      >
        <option value="me">Me</option>
        {dealOwnerUserId != null ? (
          <option value="deal_owner">
            Deal owner
            {dealOwnerMember ? ` (${dealOwnerMember.email})` : ""}
          </option>
        ) : null}
        {activeMembers
          .filter((m) => m.user_id !== currentUserId)
          .map((m) => (
            <option key={m.user_id} value={`member:${m.user_id}`}>
              {m.email || m.username}
            </option>
          ))}
      </select>
      <span className="mt-1 block text-[11px] font-normal text-zinc-400">
        Clear ownership — who is responsible for this follow-up.
      </span>
    </label>
  );
}
