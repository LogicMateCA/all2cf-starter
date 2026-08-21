import { useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  LogIn,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | Date | null;
  createdAt?: string | Date;
};

type AdminSession = {
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string | Date;
  expiresAt?: string | Date;
};

const pageSize = 20;

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleString();
}

function hasRole(user: AdminUser, role: string) {
  return String(user.role || "user")
    .split(",")
    .map((value) => value.trim())
    .includes(role);
}

export function AdminUsers({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [nextRole, setNextRole] = useState<"user" | "admin">("user");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("604800");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "" | "revoke" | "impersonate"
  >("");
  const [error, setError] = useState("");
  const selected = users.find(({ id }) => id === selectedId) || null;

  const loadUsers = async (nextOffset = offset, nextSearch = search) => {
    setLoading(true);
    setError("");
    const result = await authClient.admin.listUsers({
      query: {
        limit: pageSize,
        offset: nextOffset,
        sortBy: "createdAt",
        sortDirection: "desc",
        searchValue: nextSearch || undefined,
        searchField: "email",
        searchOperator: "contains",
      },
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Unable to load users.");
      return;
    }
    const nextUsers = (result.data?.users || []) as AdminUser[];
    setUsers(nextUsers);
    setTotal(result.data?.total || 0);
    if (selectedId && !nextUsers.some(({ id }) => id === selectedId)) {
      setSelectedId("");
      setSessions([]);
    }
  };

  const loadSessions = async (userId: string) => {
    setError("");
    const result = await authClient.admin.listUserSessions({ userId });
    if (result.error) {
      setError(result.error.message || "Unable to load user sessions.");
      return;
    }
    setSessions((result.data?.sessions || []) as AdminSession[]);
  };

  useEffect(() => {
    void loadUsers(0, "");
  }, []);

  useEffect(() => {
    if (!selected) return;
    setNextRole(hasRole(selected, "admin") ? "admin" : "user");
    setBanReason(selected.banReason || "");
    setConfirmAction("");
    void loadSessions(selected.id);
  }, [selected?.id]);

  const runMutation = async (
    label: string,
    operation: () => Promise<{ error?: { message?: string } | null }>,
  ) => {
    setBusy(label);
    setError("");
    const result = await operation();
    setBusy("");
    if (result.error) {
      setError(result.error.message || `Unable to ${label}.`);
      return false;
    }
    await loadUsers();
    if (selectedId) await loadSessions(selectedId);
    return true;
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setOffset(0);
    setSearch(query.trim());
    void loadUsers(0, query.trim());
  };

  const changePage = (nextOffset: number) => {
    setOffset(nextOffset);
    void loadUsers(nextOffset, search);
  };

  const setRole = async () => {
    if (!selected || selected.id === currentUserId) return;
    await runMutation("set role", () =>
      authClient.admin.setRole({ userId: selected.id, role: nextRole }),
    );
  };

  const banUser = async () => {
    if (!selected || selected.id === currentUserId) return;
    const seconds = Number(banDuration);
    await runMutation("ban user", () =>
      authClient.admin.banUser({
        userId: selected.id,
        banReason: banReason.trim() || "Policy violation",
        banExpiresIn: seconds > 0 ? seconds : undefined,
      }),
    );
  };

  const unbanUser = async () => {
    if (!selected || selected.id === currentUserId) return;
    await runMutation("unban user", () =>
      authClient.admin.unbanUser({ userId: selected.id }),
    );
  };

  const revokeSessions = async () => {
    if (!selected || selected.id === currentUserId) return;
    if (confirmAction !== "revoke") {
      setConfirmAction("revoke");
      return;
    }
    await runMutation("revoke sessions", () =>
      authClient.admin.revokeUserSessions({ userId: selected.id }),
    );
    setConfirmAction("");
  };

  const impersonate = async () => {
    if (
      !selected ||
      selected.id === currentUserId ||
      hasRole(selected, "admin")
    )
      return;
    if (confirmAction !== "impersonate") {
      setConfirmAction("impersonate");
      return;
    }
    setBusy("impersonate user");
    const result = await authClient.admin.impersonateUser({
      userId: selected.id,
    });
    if (result.error) {
      setBusy("");
      setError(result.error.message || "Unable to impersonate user.");
      return;
    }
    window.location.assign("/app");
  };

  return (
    <div className="admin-users-layout">
      <section className="operations-card admin-user-directory">
        <form className="admin-user-search" onSubmit={submitSearch}>
          <label htmlFor="admin-user-search">Search users by email</label>
          <div>
            <Input
              id="admin-user-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name@example.com"
            />
            <Button type="submit" variant="outline">
              <Search size={14} /> Search
            </Button>
          </div>
        </form>
        <div className="admin-user-directory-head">
          <div>
            <h3>User directory</h3>
            <p>{total} platform accounts</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Refresh users"
            onClick={() => void loadUsers()}
          >
            <RefreshCw size={15} />
          </Button>
        </div>
        <div className="admin-user-rows" aria-busy={loading}>
          {loading ? (
            <p className="admin-user-loading">Loading users…</p>
          ) : null}
          {!loading && !users.length ? (
            <p className="admin-user-loading">No matching users.</p>
          ) : null}
          {users.map((user) => (
            <button
              type="button"
              key={user.id}
              className={selectedId === user.id ? "selected" : ""}
              aria-current={selectedId === user.id ? "true" : undefined}
              onClick={() => setSelectedId(user.id)}
            >
              <span>
                <strong>{user.name || user.email}</strong>
                <small>{user.email}</small>
              </span>
              <i className={`status ${user.banned ? "failed" : "implemented"}`}>
                {user.banned ? "banned" : user.role || "user"}
              </i>
            </button>
          ))}
        </div>
        <footer className="admin-user-pagination">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => changePage(Math.max(offset - pageSize, 0))}
          >
            <ChevronLeft size={14} /> Previous
          </Button>
          <span>
            {total ? offset + 1 : 0}–{Math.min(offset + pageSize, total)} of{" "}
            {total}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={offset + pageSize >= total}
            onClick={() => changePage(offset + pageSize)}
          >
            Next <ChevronRight size={14} />
          </Button>
        </footer>
      </section>

      <section className="operations-card admin-user-detail">
        {!selected ? (
          <div className="admin-module-empty">
            <Shield size={22} />
            <strong>Select a user</strong>
            <p>Review identity, role, ban state, and active sessions.</p>
          </div>
        ) : (
          <>
            <header>
              <div>
                <span>Platform user</span>
                <h3>{selected.name || selected.email}</h3>
                <p>{selected.email}</p>
              </div>
              <i
                className={`status ${selected.banned ? "failed" : "implemented"}`}
              >
                {selected.banned ? "banned" : "active"}
              </i>
            </header>
            <dl className="admin-user-facts">
              <div>
                <dt>Email</dt>
                <dd>{selected.emailVerified ? "verified" : "unverified"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(selected.createdAt)}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{selected.role || "user"}</dd>
              </div>
              <div>
                <dt>Sessions</dt>
                <dd>{sessions.length}</dd>
              </div>
            </dl>

            <section className="admin-user-action">
              <div>
                <h4>Platform role</h4>
                <p>Organization roles never grant this platform authority.</p>
              </div>
              <div className="admin-user-action-row">
                <select
                  aria-label="Platform role"
                  value={nextRole}
                  disabled={selected.id === currentUserId || Boolean(busy)}
                  onChange={(event) =>
                    setNextRole(event.target.value as "user" | "admin")
                  }
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    selected.id === currentUserId ||
                    Boolean(busy) ||
                    nextRole === (hasRole(selected, "admin") ? "admin" : "user")
                  }
                  onClick={() => void setRole()}
                >
                  <Shield size={14} /> Apply role
                </Button>
              </div>
              {selected.id === currentUserId ? (
                <small>Your own authority cannot be changed here.</small>
              ) : null}
            </section>

            <section className="admin-user-action">
              <div>
                <h4>{selected.banned ? "Ban state" : "Ban user"}</h4>
                <p>Banning prevents sign-in and revokes existing sessions.</p>
              </div>
              {selected.banned ? (
                <>
                  <p className="admin-ban-reason">
                    {selected.banReason || "No reason recorded"} · until{" "}
                    {formatDate(selected.banExpires)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={selected.id === currentUserId || Boolean(busy)}
                    onClick={() => void unbanUser()}
                  >
                    <ShieldOff size={14} /> Unban
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    value={banReason}
                    disabled={selected.id === currentUserId || Boolean(busy)}
                    onChange={(event) => setBanReason(event.target.value)}
                    placeholder="Reason"
                    aria-label="Ban reason"
                  />
                  <div className="admin-user-action-row">
                    <select
                      aria-label="Ban duration"
                      value={banDuration}
                      disabled={selected.id === currentUserId || Boolean(busy)}
                      onChange={(event) => setBanDuration(event.target.value)}
                    >
                      <option value="86400">1 day</option>
                      <option value="604800">7 days</option>
                      <option value="2592000">30 days</option>
                      <option value="0">Permanent</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={selected.id === currentUserId || Boolean(busy)}
                      onClick={() => void banUser()}
                    >
                      <Ban size={14} /> Ban user
                    </Button>
                  </div>
                </>
              )}
            </section>

            <section className="admin-user-action">
              <div>
                <h4>Sessions</h4>
                <p>Revoke every active browser and device session.</p>
              </div>
              <div className="admin-session-list">
                {sessions.slice(0, 4).map((userSession) => (
                  <p key={userSession.token}>
                    <span>{userSession.userAgent || "Unknown device"}</span>
                    <small>
                      {userSession.ipAddress || "Unknown IP"} · expires{" "}
                      {formatDate(userSession.expiresAt)}
                    </small>
                  </p>
                ))}
                {!sessions.length ? <p>No active sessions.</p> : null}
              </div>
              <div className="admin-user-action-row">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    selected.id === currentUserId ||
                    !sessions.length ||
                    Boolean(busy)
                  }
                  onClick={() => void revokeSessions()}
                >
                  <ShieldOff size={14} />
                  {confirmAction === "revoke"
                    ? "Confirm revoke"
                    : "Revoke sessions"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    selected.id === currentUserId ||
                    hasRole(selected, "admin") ||
                    Boolean(busy)
                  }
                  onClick={() => void impersonate()}
                >
                  <LogIn size={14} />
                  {confirmAction === "impersonate"
                    ? "Confirm impersonation"
                    : "Impersonate"}
                </Button>
                {confirmAction ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmAction("")}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
              {confirmAction === "revoke" ? (
                <small>This signs {selected.email} out on every device.</small>
              ) : confirmAction === "impersonate" ? (
                <small>
                  You will enter a one-hour audited session as {selected.email}.
                </small>
              ) : null}
              {hasRole(selected, "admin") ? (
                <small>
                  Admin impersonation is disabled by the server policy.
                </small>
              ) : null}
            </section>
          </>
        )}
        {error ? (
          <p className="operations-error" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? (
          <p className="admin-user-busy" aria-live="polite">
            Working: {busy}…
          </p>
        ) : null}
      </section>
    </div>
  );
}
