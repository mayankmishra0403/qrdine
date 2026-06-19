"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEvents } from "@/hooks/use-events";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: number;
  orderId?: string;
  read: boolean;
};

const NOTIFICATION_LABELS: Record<string, { icon: string; title: string }> = {
  "new-order": { icon: "🆕", title: "New Order" },
  "status-update": { icon: "🔄", title: "Status Update" },
  "order-deleted": { icon: "🗑️", title: "Order Cancelled" },
  "order-ready": { icon: "🛎️", title: "Order Ready" },
  "table-update": { icon: "🪑", title: "Table Update" },
  "owner-alert": { icon: "🔔", title: "Alert" },
};

export function NotificationCenter() {
  const { lastEvent, connected } = useEvents();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (!lastEvent) return;
    playNotificationSound();
    const label = NOTIFICATION_LABELS[lastEvent.type];
    const notif: Notification = {
      id: `${lastEvent.type}-${Date.now()}`,
      type: lastEvent.type,
      title: label?.title || lastEvent.type,
      body: formatMessage(lastEvent),
      timestamp: Date.now(),
      orderId: (lastEvent as Record<string, unknown>).orderId as string | undefined,
      read: false,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 20));
  }, [lastEvent]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function getRoleUrl(type: string, orderId?: string): string {
    if (["new-order", "status-update", "order-deleted"].includes(type)) return orderId ? `/kitchen?order=${orderId}` : "/kitchen";
    if (["order-ready", "table-update"].includes(type)) return orderId ? `/waiter-app/orders?order=${orderId}` : "/waiter-app/orders";
    return "/admin/orders";
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {!connected && <span className="block w-1.5 h-1.5 rounded-full bg-red-400 mx-auto -mt-0.5" title="Disconnected" />}

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-blue-600 font-semibold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-1">🔔</p>
                <p className="text-xs font-semibold">No notifications yet</p>
                <p className="text-[10px] mt-1">Real-time updates appear here</p>
              </div>
            ) : (
              notifications.map((n) => {
                const label = NOTIFICATION_LABELS[n.type];
                return (
                  <a
                    key={n.id}
                    href={getRoleUrl(n.type, n.orderId)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !n.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <span className="text-lg mt-0.5">{label?.icon || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${!n.read ? "font-bold" : "font-semibold"}`}>{n.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[9px] text-gray-400 mt-1">
                        {formatTime(n.timestamp)}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMessage(event: Record<string, unknown>): string {
  const type = event.type as string;
  const orderId = (event.orderId as string)?.slice(-6).toUpperCase() || "";
  const table = event.tableNumber ? `Table ${event.tableNumber}` : "Takeaway";
  switch (type) {
    case "new-order":
      return `${table} • ${event.itemCount || 0} items • ₹${Number(event.total || 0).toFixed(2)}`;
    case "status-update":
      return `#${orderId} → ${(event.status as string)?.toUpperCase()}`;
    case "order-deleted":
      return `#${orderId} • Cancelled`;
    case "order-ready":
      return `${table} • Ready for pickup/service`;
    case "table-update":
      return `${table} → ${event.status}`;
    case "owner-alert":
      return (event.message as string) || "System alert";
    default:
      return JSON.stringify(event);
  }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(990, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.24);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
