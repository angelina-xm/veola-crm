"use client";

import { cn } from "@/src/lib/cn";
import {
  relationshipStatusLabel,
  STATUS_CLASS,
} from "@/src/lib/clientRelationship";
import { initialsFromLabel } from "@/src/lib/nav";
import type { Client, ClientContact } from "@/src/types";

export default function ClientProfileHero({
  client,
  primaryContact,
  children,
}: {
  client: Client;
  primaryContact: ClientContact | null;
  children?: React.ReactNode;
}) {
  const isBusiness = (client.client_type ?? "business") === "business";
  const initials = initialsFromLabel(client.name);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[var(--vx-shadow-card)]">
      <div className="bg-gradient-to-br from-zinc-50 via-white to-blue-50/30 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--vx-accent)] text-lg font-bold text-white shadow-[var(--vx-shadow-accent)]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  isBusiness ? "bg-zinc-100 text-zinc-700" : "bg-violet-50 text-violet-700"
                )}
              >
                {isBusiness ? "Business" : "Individual"}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                  STATUS_CLASS[client.relationship_status ?? "active"] ??
                    STATUS_CLASS.active
                )}
              >
                {relationshipStatusLabel(client.relationship_status)}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {client.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
              {client.website ? (
                <a
                  href={
                    client.website.startsWith("http")
                      ? client.website
                      : `https://${client.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--vx-accent)] hover:underline"
                >
                  {client.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
              {client.email ? <span>{client.email}</span> : null}
              {client.phone ? <span>{client.phone}</span> : null}
            </div>
            {primaryContact ? (
              <p className="mt-2 text-xs text-zinc-500">
                Primary:{" "}
                <span className="font-medium text-zinc-700">
                  {primaryContact.full_name}
                  {primaryContact.role_title
                    ? ` · ${primaryContact.role_title}`
                    : ""}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
