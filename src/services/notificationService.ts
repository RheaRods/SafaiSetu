import { supabase } from '@/lib/supabase';
import type { NotificationType } from '@/types';

export async function createNotification(profileId: string, title: string, message: string, type: NotificationType) {
  const { error } = await supabase
    .from('notifications')
    .insert({ profile_id: profileId, title, message, type });
  if (error) throw error;
}

export async function getNotifications(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getUnreadCount(profileId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllAsRead(profileId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', profileId)
    .eq('is_read', false);
  if (error) throw error;
}
