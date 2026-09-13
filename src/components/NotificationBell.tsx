import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getNotifications, getUnreadCount, markAllAsRead } from '@/services/notificationService';
import type { NotificationItem } from '@/types';
import { Bell, Clock, AlertTriangle, RefreshCw, MapPin, Calendar, Check } from 'lucide-react';

const iconMap: Record<string, typeof Bell> = {
  reminder: Clock,
  missed: AlertTriangle,
  recovery: RefreshCw,
  hotspot: MapPin,
  ewaste: Calendar,
  status: Check,
};

const colorMap: Record<string, string> = {
  reminder: 'text-clay-dark bg-clay/10',
  missed: 'text-brick bg-brick/10',
  recovery: 'text-forest bg-moss/15',
  hotspot: 'text-ink/70 bg-sand',
  ewaste: 'text-forest bg-forest/10',
  status: 'text-forest bg-moss/15',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const [notifs, count] = await Promise.all([
      getNotifications(profile.id),
      getUnreadCount(profile.id),
    ]);
    setNotifications(notifs as NotificationItem[]);
    setUnread(count);
  }, [profile]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAll = async () => {
    if (!profile) return;
    await markAllAsRead(profile.id);
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unread > 0) {
            setTimeout(handleMarkAll, 1000);
          }
        }}
        className="relative p-2 rounded-md hover:bg-forest-dark transition"
      >
        <Bell className="w-5 h-5 text-paper/80" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brick text-paper text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-sand z-50">
            <div className="p-3 border-b border-sand flex items-center justify-between">
              <span className="font-display font-semibold text-ink text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-forest font-medium hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ink/40 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-sand-light">
                {notifications.slice(0, 20).map((n) => {
                  const Icon = iconMap[n.type] || Bell;
                  return (
                    <div key={n.id} className={`p-3 flex gap-3 ${!n.is_read ? 'bg-moss/10' : ''}`}>
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${colorMap[n.type] || 'text-ink/60 bg-sand-light'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">{n.title}</p>
                        {n.message && <p className="text-xs text-ink/50 mt-0.5">{n.message}</p>}
                        <p className="text-[10px] text-ink/40 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
