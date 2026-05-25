"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";
import PageHeader from "@/src/components/ui/PageHeader";
import { useAuth } from "@/src/components/auth/AuthProvider";
import { useMembership } from "@/src/context/MembershipContext";
import {
  deleteTeamMember,
  getTeamMembers,
  patchTeamMember,
  postTeamInvite,
  type TeamMember,
  type TeamMemberUpdatePayload,
  type TeamInvitePayload,
} from "@/src/lib/api";
import { getStoredCompanyId, readEnvCompanyId } from "@/src/lib/auth";
import { canManageTeam } from "@/src/lib/roles";
import { useTranslation } from "@/src/context/LocaleContext";

const PERMISSION_KEYS: {
  key: keyof TeamMemberUpdatePayload;
  labelKey: string;
}[] = [
  { key: "can_view_all_deals", labelKey: "team.permViewDeals" },
  { key: "can_create_deals", labelKey: "team.permCreateDeals" },
  { key: "can_edit_all_deals", labelKey: "team.permEditDeals" },
  { key: "can_delete_deals", labelKey: "team.permDeleteDeals" },
  { key: "can_manage_automations", labelKey: "team.permAutomations" },
  { key: "can_manage_team", labelKey: "team.permTeam" },
  { key: "can_view_analytics", labelKey: "team.permAnalytics" },
];

function formatJoined(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function TeamPage() {
  const { t } = useTranslation();
  const { isReady, isAuthenticated } = useAuth();
  const { membership, loading: membershipLoading, refreshMembership } =
    useMembership();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<
    { email: string; role: string; expires_at: string; token: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "employee">("manager");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editDraft, setEditDraft] = useState<TeamMemberUpdatePayload>({});
  const [saveBusy, setSaveBusy] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const canAccess = useMemo(
    () => !membershipLoading && canManageTeam(membership),
    [membership, membershipLoading]
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, []);

  useLayoutEffect(() => {
    if (!isReady || !isAuthenticated) return;
    setCompanyId(getStoredCompanyId() ?? readEnvCompanyId());
  }, [isReady, isAuthenticated]);

  const loadTeam = useCallback(async () => {
    if (companyId === null || !canAccess) return;
    setLoading(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const data = await getTeamMembers(tenantId);
      setMembers(data.members);
      setPendingInvites(data.pending_invites);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("team.failedLoad"));
      setMembers([]);
      setPendingInvites([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, canAccess, t]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || companyId === null || !canAccess) return;
    void loadTeam();
  }, [canAccess, companyId, isAuthenticated, isReady, loadTeam]);

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === "owner" && m.is_active).length,
    [members]
  );

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setEditDraft({
      role: m.role,
      is_active: m.is_active,
      can_view_all_deals: m.can_view_all_deals,
      can_create_deals: m.can_create_deals,
      can_edit_all_deals: m.can_edit_all_deals,
      can_delete_deals: m.can_delete_deals,
      can_manage_team: m.can_manage_team,
      can_manage_automations: m.can_manage_automations,
      can_view_analytics: m.can_view_analytics,
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!editing || companyId === null) return;
    setSaveBusy(true);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await patchTeamMember(tenantId, editing.id, editDraft);
      await loadTeam();
      void refreshMembership();
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("team.saveFailed"));
    } finally {
      setSaveBusy(false);
    }
  };

  const removeMember = async (m: TeamMember) => {
    if (m.role === "owner") return;
    if (!window.confirm(t("team.removeConfirmEmail", { email: m.email }))) return;
    if (companyId === null) return;
    setRemovingId(m.id);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      await deleteTeamMember(tenantId, m.id);
      await loadTeam();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("team.removeFailed"));
    } finally {
      setRemovingId(null);
    }
  };

  const submitInvite = async () => {
    if (companyId === null) return;
    setInviteBusy(true);
    setInviteMsg(null);
    setError(null);
    try {
      const tenantId = getStoredCompanyId() ?? companyId;
      const payload: TeamInvitePayload = {
        email: inviteEmail.trim(),
        role: inviteRole,
      };
      const res = await postTeamInvite(tenantId, payload);
      if (res.status === "attached") {
        setInviteMsg(t("team.addedMember", { email: res.member.email }));
      } else {
        setInviteMsg(
          t("team.inviteCreated", { token: res.token.slice(0, 8) })
        );
      }
      setInviteEmail("");
      await loadTeam();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("team.inviteFailed"));
    } finally {
      setInviteBusy(false);
    }
  };

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <ProtectedRoute>
      <>
          <PageHeader
            eyebrow={t("nav.workspace")}
            title={t("team.pageTitle")}
            description={t("team.pageDescriptionInvite")}
          />

          {membershipLoading ? (
            <p className="text-sm text-slate-500">{t("team.checkingAccess")}</p>
          ) : !canManageTeam(membership) ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("team.noPermission")}
            </div>
          ) : loading ? (
            <p className="text-sm text-slate-500">{t("team.loadingTeam")}</p>
          ) : (
            <>
              {error ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-slate-800">{t("team.members")}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setInviteOpen(true);
                    setInviteMsg(null);
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                >
                  {t("team.invite")}
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("team.colMember")}</th>
                      <th className="px-4 py-3">{t("team.colRole")}</th>
                      <th className="px-4 py-3">{t("team.colJoined")}</th>
                      <th className="px-4 py-3 text-right">{t("team.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{m.email}</div>
                          <div className="text-xs text-slate-500">@{m.username}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {PERMISSION_KEYS.map(({ key, labelKey }) => (
                              <span
                                key={key}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  Boolean(m[key as keyof TeamMember])
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {t(labelKey)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{m.role}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatJoined(m.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="mr-2 text-indigo-600 hover:underline"
                          >
                            {t("team.edit")}
                          </button>
                          {m.role !== "owner" ? (
                            <button
                              type="button"
                              disabled={removingId === m.id}
                              onClick={() => void removeMember(m)}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              {t("team.removeMember")}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pendingInvites.length > 0 ? (
                <section className="mt-10">
                  <h2 className="mb-3 text-lg font-medium text-slate-800">
                    Pending invites
                  </h2>
                  <ul className="space-y-2">
                    {pendingInvites.map((inv) => (
                      <li
                        key={`${inv.email}-${inv.token}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{inv.email}</span>
                          <span className="ml-2 capitalize text-slate-600">
                            ({inv.role})
                          </span>
                          <div className="text-xs text-slate-500">
                            Expires {formatJoined(inv.expires_at)}
                          </div>
                        </div>
                        <code className="max-w-xs truncate rounded bg-slate-100 px-2 py-1 text-xs">
                          {inv.token}
                        </code>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}

        {inviteOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => setInviteOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
              role="dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900">Invite member</h3>
              <p className="mt-1 text-xs text-slate-500">
                Existing users are added immediately. New users get a pending invite
                token to accept from the app.
              </p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  placeholder="colleague@company.com"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Role preset
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "manager" | "employee")
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                >
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </label>
              {inviteMsg ? (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {inviteMsg}
                </p>
              ) : null}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={inviteBusy || !inviteEmail.trim()}
                  onClick={() => void submitInvite()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {inviteBusy ? "Sending…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editing ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={closeEdit}
          >
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
              role="dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900">
                Edit {editing.email}
              </h3>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Role
                <select
                  value={editDraft.role ?? editing.role}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      role: e.target.value as TeamMember["role"],
                    }))
                  }
                  disabled={editing.role === "owner" && ownerCount <= 1}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </label>
              {editing.role === "owner" && ownerCount <= 1 ? (
                <p className="mt-2 text-xs text-amber-700">
                  This is the only owner — role cannot be changed until another owner
                  exists.
                </p>
              ) : null}

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editDraft.is_active ?? editing.is_active}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, is_active: e.target.checked }))
                  }
                />
                Active member
              </label>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Permissions
                </p>
                {editing.role === "owner" ? (
                  <p className="text-xs text-slate-500">
                    Owners always have full access in the product. Saving as owner
                    resets all flags to enabled on the server.
                  </p>
                ) : null}
                {PERMISSION_KEYS.map(({ key, labelKey }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span>{t(labelKey)}</span>
                    <input
                      type="checkbox"
                      disabled={editing.role === "owner"}
                      checked={Boolean(
                        editDraft[key] ??
                          editing[key as keyof TeamMember] ??
                          false
                      )}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveBusy}
                  onClick={() => void saveEdit()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saveBusy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    </ProtectedRoute>
  );
}
