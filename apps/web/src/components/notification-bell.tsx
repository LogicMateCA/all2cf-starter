import { useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Notification = { id: string; category: string; title: string; body: string; deep_link: string | null; read_at: string | null; created_at: string };
type Payload = { data?: { notifications: Notification[]; unreadCount: number }; error?: { message?: string } };
type LoadState = "loading" | "ready" | "error";

export function isSafeDeepLink(value: string | null): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !/^[a-z][a-z\d+.-]*:/iu.test(value));
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function useNotifications(limit: number) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const load = async () => {
    setState("loading"); setError("");
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`, { credentials: "include", headers: { Accept: "application/json" } });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Unable to load notifications.");
      setNotifications(payload.data.notifications); setUnreadCount(payload.data.unreadCount); setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load notifications."); setState("error"); }
  };
  useEffect(() => { void load(); }, [limit]);
  const markRead = async (notification: Notification) => {
    if (notification.read_at) return true;
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, { method: "PATCH", credentials: "include" });
      if (!response.ok) throw new Error("Unable to mark notification as read.");
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      setUnreadCount((count) => Math.max(0, count - 1)); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to mark notification as read."); return false; }
  };
  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Unable to mark notifications as read.");
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0); setError(""); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to mark notifications as read."); return false; }
  };
  return { notifications, unreadCount, state, error, load, markRead, markAllRead };
}

function NotificationItems({ notifications, onSelect }: { notifications: Notification[]; onSelect: (notification: Notification) => void }) {
  return <div className="notification-list">{notifications.map((notification) => <button type="button" key={notification.id} className={notification.read_at ? "notification-item" : "notification-item unread"} onClick={() => onSelect(notification)}><span className="notification-dot" aria-hidden="true" /><span><strong>{notification.title}</strong><small>{notification.body}</small><time dateTime={notification.created_at}>{relativeTime(notification.created_at)}</time></span>{isSafeDeepLink(notification.deep_link) ? <ExternalLink size={13} aria-hidden="true" /> : null}</button>)}</div>;
}

function NotificationStates({ state, error, hasItems, onRetry }: { state: LoadState; error: string; hasItems: boolean; onRetry: () => void }) {
  if (state === "loading") return <p className="notification-state" role="status">Loading notifications…</p>;
  if (state === "error") return <div className="notification-state"><p role="alert">{error || "Notifications could not be loaded."}</p><button type="button" onClick={onRetry}>Try again</button></div>;
  return !hasItems ? <p className="notification-state">No notifications yet.</p> : null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false); const model = useNotifications(8);
  const select = async (notification: Notification) => { if (await model.markRead(notification) && isSafeDeepLink(notification.deep_link)) window.location.href = notification.deep_link; };
  return <div className="notification-control"><Button variant="ghost" size="icon" className="notification-trigger" aria-label={model.unreadCount ? `${model.unreadCount} unread notifications` : "Notifications"} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void model.load(); }}><Bell size={17} />{model.unreadCount ? <span className="notification-badge" aria-hidden="true">{model.unreadCount > 99 ? "99+" : model.unreadCount}</span> : null}</Button>{open ? <section className="notification-popover" aria-label="Notifications"><header><div><strong>Notifications</strong><small>{model.unreadCount ? `${model.unreadCount} unread` : "All caught up"}</small></div>{model.unreadCount ? <button type="button" onClick={() => void model.markAllRead()}><CheckCheck size={14} />Mark all read</button> : null}</header><NotificationStates state={model.state} error={model.error} hasItems={model.notifications.length > 0} onRetry={() => void model.load()} />{model.state === "ready" && model.notifications.length ? <NotificationItems notifications={model.notifications} onSelect={(item) => void select(item)} /> : null}<a className="notification-all" href="/app/notifications">View all notifications</a></section> : null}</div>;
}

export function NotificationCenter() {
  const model = useNotifications(50);
  const select = async (notification: Notification) => { if (await model.markRead(notification) && isSafeDeepLink(notification.deep_link)) window.location.href = notification.deep_link; };
  return <section className="notification-center" aria-label="All notifications"><header className="notification-center-toolbar"><div><strong>{model.unreadCount ? `${model.unreadCount} unread` : "All caught up"}</strong><small>{model.notifications.length} loaded</small></div>{model.unreadCount ? <Button variant="outline" size="sm" onClick={() => void model.markAllRead()}><CheckCheck size={14} />Mark all read</Button> : null}</header>{model.error && model.state === "ready" ? <p className="notification-inline-error" role="alert">{model.error}</p> : null}<NotificationStates state={model.state} error={model.error} hasItems={model.notifications.length > 0} onRetry={() => void model.load()} />{model.state === "ready" && model.notifications.length ? <NotificationItems notifications={model.notifications} onSelect={(item) => void select(item)} /> : null}</section>;
}

export function RecentActivity() {
  const model = useNotifications(5);
  const select = async (notification: Notification) => {
    if (
      (await model.markRead(notification)) &&
      isSafeDeepLink(notification.deep_link)
    )
      window.location.href = notification.deep_link;
  };
  if (model.state === "loading")
    return <p className="saas-activity-state" role="status">Loading recent activity…</p>;
  if (model.state === "error")
    return (
      <div className="saas-activity-state">
        <p role="alert">{model.error}</p>
        <Button variant="outline" size="sm" onClick={() => void model.load()}>
          Try again
        </Button>
      </div>
    );
  if (!model.notifications.length)
    return (
      <div className="saas-activity-empty">
        <strong>No recent activity yet</strong>
        <p>
          Support replies, billing events, organization invitations, and product
          events will appear here when their owning modules emit them.
        </p>
      </div>
    );
  return (
    <div className="saas-activity-list">
      {model.notifications.map((notification) => (
        <button
          type="button"
          key={notification.id}
          className={notification.read_at ? undefined : "unread"}
          onClick={() => void select(notification)}
        >
          <span className="notification-dot" aria-hidden="true" />
          <span>
            <strong>{notification.title}</strong>
            <small>{notification.body}</small>
          </span>
          <time dateTime={notification.created_at}>
            {relativeTime(notification.created_at)}
          </time>
        </button>
      ))}
      <a href="/app/notifications">View notification history</a>
    </div>
  );
}
