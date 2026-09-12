import { supabase } from '@/lib/supabase';
import type { Worker, Route, CollectionTask, CleanupAssignment, CollectionStatus } from '@/types';

export async function getWorkerByProfile(profileId: string) {
  const { data, error } = await supabase
    .from('workers')
    .select('*, assigned_ward:wards(name), municipality:municipalities(name)')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  return data as Worker | null;
}

export async function getWorkerRoutes(workerId: string) {
  const { data, error } = await supabase
    .from('routes')
    .select('*, ward:wards(*)')
    .eq('worker_id', workerId)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return data as (Route & { ward: { id: string; name: string } })[];
}

export async function getTodayTasks(workerId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('collection_tasks')
    .select(`
      *,
      household:households(*),
      route:routes(*)
    `)
    .eq('worker_id', workerId)
    .eq('scheduled_date', today)
    .order('scheduled_date', { ascending: true });
  if (error) throw error;

  // Sort by sequence_order from route_households
  const tasksWithSequence = await Promise.all(
    (data as (CollectionTask & { household: any; route: any })[]).map(async (task) => {
      const { data: rh } = await supabase
        .from('route_households')
        .select('sequence_order')
        .eq('route_id', task.route_id)
        .eq('household_id', task.household_id)
        .maybeSingle();
      return { ...task, sequence_order: rh?.sequence_order ?? 999 };
    })
  );

  return tasksWithSequence.sort((a, b) => a.sequence_order - b.sequence_order);
}

export async function updateTaskStatus(taskId: string, status: CollectionStatus, note?: string, lat?: number, lng?: number) {
  const update: Record<string, any> = { status };
  if (status === 'collected') {
    update.completed_at = new Date().toISOString();
  }
  if (note !== undefined) update.worker_note = note;
  if (lat !== undefined) update.latitude = lat;
  if (lng !== undefined) update.longitude = lng;

  const { data, error } = await supabase
    .from('collection_tasks')
    .update(update)
    .eq('id', taskId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Send notification to household
  if (data) {
    const { data: household } = await supabase
      .from('households')
      .select('profile_id')
      .eq('id', data.household_id)
      .maybeSingle();

    if (household) {
      const titles: Record<string, string> = {
        collected: 'Waste Collected',
        missed: 'Collection Missed',
        unavailable: 'Collection Unavailable',
        inaccessible: 'Lane Inaccessible',
      };
      await supabase.rpc('create_notification', {
        target_profile_id: household.profile_id,
        p_title: titles[status] || 'Collection Update',
        p_message: `Your waste collection status has been updated to: ${status.replace('_', ' ')}.`,
        p_type: 'status',
      });
    }
  }

  return data;
}

export async function getCleanupAssignments(workerId: string) {
  const { data, error } = await supabase
    .from('cleanup_assignments')
    .select(`
      *,
      hotspot:hotspot_reports(*)
    `)
    .eq('assigned_worker_id', workerId)
    .neq('status', 'completed')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (CleanupAssignment & { hotspot: any })[];
}

export async function completeCleanup(assignmentId: string, photoUrl?: string) {
  const { data, error } = await supabase
    .from('cleanup_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_photo_url: photoUrl,
    })
    .eq('id', assignmentId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Update hotspot status to resolved
  if (data) {
    await supabase.from('hotspot_reports').update({ status: 'resolved' }).eq('id', data.hotspot_report_id);
  }

  return data;
}

export async function getRecoveryAssignments(workerId: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .select(`
      *,
      household:households(*),
      collection_task:collection_tasks(*)
    `)
    .eq('assigned_worker_id', workerId)
    .neq('status', 'resolved')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function completeRecovery(missedPickupId: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', missedPickupId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Notify household
  if (data) {
    const { data: hh } = await supabase.from('households').select('profile_id').eq('id', data.household_id).maybeSingle();
    if (hh?.profile_id) {
      await supabase.rpc('create_notification', {
        target_profile_id: hh.profile_id,
        p_title: 'Missed Pickup Resolved',
        p_message: 'Your missed pickup complaint has been resolved. Recovery collection completed.',
        p_type: 'recovery',
      });
    }
  }

  return data;
}
