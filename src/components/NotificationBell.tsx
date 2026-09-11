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
  reminder: 'text-amber-600 bg-amber-50',
  missed: 'text-red-600 bg-red-50',
  recovery: 'text-blue-600 bg-blue-50',
  hotspot: 'text-purple-600 bg-purple-50',
  ewaste: 'text-teal-600 bg-teal-50',
  status: 'text-emerald-600 bg-emerald-50',
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
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-teal-600 font-medium hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.slice(0, 20).map((n) => {
                  const Icon = iconMap[n.type] || Bell;
                  return (
                    <div key={n.id} className={`p-3 flex gap-3 ${!n.is_read ? 'bg-teal-50/40' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[n.type] || 'text-gray-600 bg-gray-50'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
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
