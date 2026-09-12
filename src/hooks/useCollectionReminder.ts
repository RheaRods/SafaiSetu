import { useState, useEffect, useRef } from 'react';
import { createNotification } from '@/services/notificationService';

interface ReminderState {
  active: boolean;
  message: string;
  minutesUntil: number;
}

/**
 * Fires a reminder 30 minutes before the collection window starts.
 * - Requests browser notification permission on mount.
 * - Checks every 30 seconds whether the window is approaching.
 * - Fires a browser notification, a DB notification, and an in-app banner.
 */
export function useCollectionReminder(
  profileId: string | undefined,
  windowStart: string | undefined,
  scheduledDate: string | undefined,
) {
  const [reminder, setReminder] = useState<ReminderState>({ active: false, message: '', minutesUntil: 0 });
  const firedRef = useRef(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!windowStart || !scheduledDate || !profileId) return;

    const check = () => {
      const now = new Date();

      // Build the collection start datetime from scheduled_date + window_start
      const [hh, mm] = windowStart.split(':').map(Number);
      const start = new Date(scheduledDate + 'T00:00:00');
      start.setHours(hh, mm, 0, 0);

      const diffMs = start.getTime() - now.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      // Show banner when within 30 min before and window hasn't started yet
      if (diffMin <= 30 && diffMin > 0) {
        setReminder({
          active: true,
          minutesUntil: diffMin,
          message: diffMin <= 1
            ? 'Collection is starting now! Please put your waste out.'
            : `Collection starts in ${diffMin} minutes. Please put your waste out.`,
        });

        // Fire browser + DB notification once
        if (!firedRef.current) {
          firedRef.current = true;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Waste Collection Reminder', {
              body: diffMin <= 1
                ? 'Collection is starting now! Please put your waste out.'
                : `Collection starts in ${diffMin} minutes. Please put your waste out.`,
            });
          }
          createNotification(
            profileId,
            'Collection Reminder',
            diffMin <= 1
              ? 'Collection is starting now! Please put your waste out.'
              : `Collection starts in ${diffMin} minutes. Please put your waste out.`,
            'reminder',
          ).catch(() => {});
        }
      } else if (diffMin <= 0) {
        // Window has started — hide the reminder
        setReminder((prev) => (prev.active ? { active: false, message: '', minutesUntil: 0 } : prev));
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [profileId, windowStart, scheduledDate]);

  return reminder;
}
