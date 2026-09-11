import { supabase } from '@/lib/supabase';
import type { Household, CollectionTask, MissedPickup, EwasteRequest, NotificationItem, MissedReason } from '@/types';

export async function getHousehold(profileId: string) {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as Household | null;
}

export async function updateHouseholdAddress(id: string, addressLine: string, landmark: string, latitude: number, longitude: number) {
  const { data, error } = await supabase
    .from('households')
    .update({ address_line: addressLine, landmark, latitude, longitude })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Household | null;
}

export async function getTodayTasks(householdId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('collection_tasks')
    .select('*, route:routes(*)')
    .eq('household_id', householdId)
    .eq('scheduled_date', today)
    .maybeSingle();
  if (error) throw error;
  return data as (CollectionTask & { route: { collection_window_start: string; collection_window_end: string; day_of_week: string } }) | null;
}

export async function getWeeklySchedule(householdId: string) {
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const monday = new Date(startOfWeek);
  monday.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  const endOfWeek = new Date(monday);
  endOfWeek.setDate(monday.getDate() + 6);

  const { data, error } = await supabase
    .from('collection_tasks')
    .select('*, route:routes(*)')
    .eq('household_id', householdId)
    .gte('scheduled_date', monday.toISOString().split('T')[0])
    .lte('scheduled_date', endOfWeek.toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true });
  if (error) throw error;
  return data as (CollectionTask & { route: { collection_window_start: string; collection_window_end: string; day_of_week: string } })[];
}

export async function getCollectionHistory(householdId: string, limit = 30) {
  const { data, error } = await supabase
    .from('collection_tasks')
    .select('*')
    .eq('household_id', householdId)
    .neq('status', 'scheduled')
    .order('scheduled_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as CollectionTask[];
}

export async function reportMissedPickup(householdId: string, collectionTaskId: string | null, reason: MissedReason, description: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .insert({ household_id: householdId, collection_task_id: collectionTaskId, reason, description })
    .select()
    .maybeSingle();
  if (error) throw error;

  if (collectionTaskId) {
    await supabase.from('collection_tasks').update({ status: 'missed' }).eq('id', collectionTaskId);
  }

  return data as MissedPickup | null;
}

export async function requestEwastePickup(householdId: string, preferredDate: string, itemDescription: string) {
  const { data, error } = await supabase
    .from('ewaste_requests')
    .insert({ household_id: householdId, preferred_date: preferredDate, item_description: itemDescription })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as EwasteRequest | null;
}

export async function getEwasteRequests(householdId: string) {
  const { data, error } = await supabase
    .from('ewaste_requests')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as EwasteRequest[];
}

export async function getMissedPickups(householdId: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as MissedPickup[];
}

export async function getNotifications(profileId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as NotificationItem[];
}
