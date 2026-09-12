import { supabase } from '@/lib/supabase';
import type { Worker, Ward, MissedPickup, HotspotReport, EwasteRequest, CollectionTask } from '@/types';

export async function getMunicipalityWards(municipalityId: string) {
  const { data, error } = await supabase
    .from('wards')
    .select('*')
    .eq('municipality_id', municipalityId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as Ward[];
}

export async function getWorkers(municipalityId: string) {
  const { data, error } = await supabase
    .from('workers')
    .select('*, profile:profiles(*), assigned_ward:wards(name)')
    .eq('municipality_id', municipalityId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as (Worker & { profile: { full_name: string; phone: string | null } })[];
}

export async function getRoutesOverview(municipalityId: string) {
  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);
  if (wardIds.length === 0) return [];

  const { data, error } = await supabase
    .from('routes')
    .select('*, ward:wards(name), route_households(household:households(id, address_line, landmark))')
    .in('ward_id', wardIds)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return data as any[];
}

export async function getTodayProgress(municipalityId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: workers } = await supabase
    .from('workers')
    .select('*, profile:profiles(*)')
    .eq('municipality_id', municipalityId)
    .eq('is_active', true);

  if (!workers) return [];

  const result = await Promise.all(
    workers.map(async (w) => {
      const { count: total } = await supabase
        .from('collection_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', w.id)
        .eq('scheduled_date', today);

      const { count: completed } = await supabase
        .from('collection_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', w.id)
        .eq('scheduled_date', today)
        .eq('status', 'collected');

      const { count: missed } = await supabase
        .from('collection_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', w.id)
        .eq('scheduled_date', today)
        .in('status', ['missed', 'unavailable', 'inaccessible']);

      return {
        worker: w,
        profile: w.profile,
        total: total ?? 0,
        completed: completed ?? 0,
        missed: missed ?? 0,
        pending: (total ?? 0) - (completed ?? 0) - (missed ?? 0),
      };
    })
  );

  return result;
}

export async function getMissedPickupQueue(municipalityId: string) {
  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);

  if (wardIds.length === 0) return [];

  const { data: households } = await supabase
    .from('households')
    .select('id, address_line, landmark, profile_id')
    .in('ward_id', wardIds);

  const householdIds = (households ?? []).map((h) => h.id);
  if (householdIds.length === 0) return [];

  const { data, error } = await supabase
    .from('missed_pickups')
    .select('*, household:households(*), assigned_worker:workers(*)')
    .in('household_id', householdIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (MissedPickup & { household: any; assigned_worker: any })[];
}

export async function getHotspotQueue(municipalityId: string) {
  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);
  if (wardIds.length === 0) return [];

  const { data, error } = await supabase
    .from('hotspot_reports')
    .select('*')
    .in('ward_id', wardIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as HotspotReport[];
}

export async function getEwasteRequests(municipalityId: string) {
  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);
  if (wardIds.length === 0) return [];

  const { data: households } = await supabase
    .from('households')
    .select('id')
    .in('ward_id', wardIds);
  const householdIds = (households ?? []).map((h) => h.id);
  if (householdIds.length === 0) return [];

  const { data, error } = await supabase
    .from('ewaste_requests')
    .select('*, household:households(*)')
    .in('household_id', householdIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (EwasteRequest & { household: any })[];
}

export async function assignRecoveryWorker(missedPickupId: string, workerId: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .update({ status: 'assigned', assigned_worker_id: workerId })
    .eq('id', missedPickupId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Notify worker
  if (data) {
    const { data: worker } = await supabase
      .from('workers')
      .select('profile_id')
      .eq('id', workerId)
      .maybeSingle();

    if (worker) {
      await supabase.rpc('create_notification', {
        target_profile_id: worker.profile_id,
        p_title: 'Recovery Assignment',
        p_message: 'You have been assigned a missed pickup recovery task.',
        p_type: 'recovery',
      });
    }
  }

  return data;
}

export async function rejectMissedPickup(missedPickupId: string) {
  const { data, error } = await supabase
    .from('missed_pickups')
    .update({ status: 'rejected' })
    .eq('id', missedPickupId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function assignCleanupWorker(hotspotReportId: string, workerId: string) {
  const { data, error } = await supabase
    .from('cleanup_assignments')
    .insert({ hotspot_report_id: hotspotReportId, assigned_worker_id: workerId })
    .select()
    .maybeSingle();
  if (error) throw error;

  await supabase.from('hotspot_reports').update({ status: 'cleanup_assigned' }).eq('id', hotspotReportId);

  // Notify worker
  const { data: worker } = await supabase
    .from('workers')
    .select('profile_id')
    .eq('id', workerId)
    .maybeSingle();

  if (worker) {
    await supabase.rpc('create_notification', {
      target_profile_id: worker.profile_id,
      p_title: 'Cleanup Assignment',
      p_message: 'You have been assigned a hotspot cleanup task.',
      p_type: 'hotspot',
    });
  }

  return data;
}

export async function updateHotspotStatus(hotspotId: string, status: string) {
  const { data, error } = await supabase
    .from('hotspot_reports')
    .update({ status })
    .eq('id', hotspotId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWeeklyStats(municipalityId: string) {
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const monday = new Date(startOfWeek);
  monday.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
  const endOfWeek = new Date(monday);
  endOfWeek.setDate(monday.getDate() + 6);

  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);
  if (wardIds.length === 0) return { daily: [], statusBreakdown: [] };

  const { data: households } = await supabase
    .from('households')
    .select('id')
    .in('ward_id', wardIds);
  const householdIds = (households ?? []).map((h) => h.id);
  if (householdIds.length === 0) return { daily: [], statusBreakdown: [] };

  const { data: tasks } = await supabase
    .from('collection_tasks')
    .select('*')
    .in('household_id', householdIds)
    .gte('scheduled_date', monday.toISOString().split('T')[0])
    .lte('scheduled_date', endOfWeek.toISOString().split('T')[0]);

  const tasksList = tasks as CollectionTask[] ?? [];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const daily = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayTasks = tasksList.filter((t) => t.scheduled_date === dateStr);
    daily.push({
      day: dayNames[i],
      collected: dayTasks.filter((t) => t.status === 'collected').length,
      missed: dayTasks.filter((t) => ['missed', 'unavailable', 'inaccessible'].includes(t.status)).length,
      scheduled: dayTasks.filter((t) => t.status === 'scheduled').length,
    });
  }

  const statusBreakdown = [
    { name: 'Collected', value: tasksList.filter((t) => t.status === 'collected').length, color: '#10b981' },
    { name: 'Scheduled', value: tasksList.filter((t) => t.status === 'scheduled').length, color: '#f59e0b' },
    { name: 'Missed', value: tasksList.filter((t) => ['missed', 'unavailable', 'inaccessible'].includes(t.status)).length, color: '#ef4444' },
  ];

  return { daily, statusBreakdown };
}

export async function addWorker(profileId: string, municipalityId: string, wardId: string) {
  const { data, error } = await supabase
    .from('workers')
    .insert({ profile_id: profileId, municipality_id: municipalityId, assigned_ward_id: wardId })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function toggleWorkerActive(workerId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('workers')
    .update({ is_active: isActive })
    .eq('id', workerId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getHouseholdsInWard(wardId: string) {
  const { data, error } = await supabase
    .from('households')
    .select('id, address_line, landmark')
    .eq('ward_id', wardId)
    .order('address_line', { ascending: true });
  if (error) throw error;
  return data as { id: string; address_line: string; landmark: string | null }[];
}

export async function assignRoute(
  wardId: string,
  workerId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  householdIds: string[]
) {
  const { data: route, error } = await supabase
    .from('routes')
    .insert({ ward_id: wardId, worker_id: workerId, day_of_week: dayOfWeek, collection_window_start: startTime, collection_window_end: endTime })
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!route) return route;

  // Only the households the supervisor actually picked go on this route.
  if (!householdIds || householdIds.length === 0) return route;

  const routeHouseholds = householdIds.map((id, i) => ({
    route_id: route.id,
    household_id: id,
    sequence_order: i,
  }));
  const { error: rhErr } = await supabase.from('route_households').insert(routeHouseholds);
  if (rhErr) throw rhErr;

  // Generate a collection task for each selected household on the next
  // occurrence of this route's day of week, so the route isn't just metadata.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = dayNames.indexOf(dayOfWeek.toLowerCase());
  const today = new Date();
  const scheduledDate = new Date(today);
  if (targetDay >= 0) {
    const diff = (targetDay - today.getDay() + 7) % 7;
    scheduledDate.setDate(today.getDate() + diff);
  }
  const dateStr = scheduledDate.toISOString().slice(0, 10);

  const tasks = householdIds.map((id) => ({
    route_id: route.id,
    household_id: id,
    worker_id: workerId,
    scheduled_date: dateStr,
    status: 'scheduled' as const,
  }));
  const { error: taskErr } = await supabase.from('collection_tasks').insert(tasks);
  if (taskErr) throw taskErr;

  return route;
}

export async function getTodayTasks(municipalityId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: wards } = await supabase
    .from('wards')
    .select('id')
    .eq('municipality_id', municipalityId);
  const wardIds = (wards ?? []).map((w) => w.id);
  if (wardIds.length === 0) return [];

  const { data: households } = await supabase
    .from('households')
    .select('id')
    .in('ward_id', wardIds);
  const householdIds = (households ?? []).map((h) => h.id);
  if (householdIds.length === 0) return [];

  const { data, error } = await supabase
    .from('collection_tasks')
    .select('*, household:households(*), worker:workers(*, profile:profiles(*))')
    .in('household_id', householdIds)
    .eq('scheduled_date', today)
    .order('status', { ascending: true });
  if (error) throw error;
  return data as any[];
}

export async function rescheduleTask(taskId: string, newDate: string, newWorkerId?: string) {
  const update: Record<string, any> = { scheduled_date: newDate, status: 'scheduled' };
  if (newWorkerId) update.worker_id = newWorkerId;

  const { data, error } = await supabase
    .from('collection_tasks')
    .update(update)
    .eq('id', taskId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Notify whichever worker ends up on the task (new one if reassigned, same one otherwise).
  if (data) {
    const { data: worker } = await supabase
      .from('workers')
      .select('profile_id')
      .eq('id', data.worker_id)
      .maybeSingle();

    if (worker) {
      await supabase.rpc('create_notification', {
        target_profile_id: worker.profile_id,
        p_title: 'Task Rescheduled',
        p_message: `A collection task has been rescheduled to ${newDate}.`,
        p_type: 'status',
      });
    }
  }

  return data;
}

export async function scheduleEwaste(requestId: string, date: string, workerId: string) {
  const { data, error } = await supabase
    .from('ewaste_requests')
    .update({ status: 'scheduled', preferred_date: date })
    .eq('id', requestId)
    .select()
    .maybeSingle();
  if (error) throw error;

  // Notify the assigned worker
  const { data: worker } = await supabase
    .from('workers')
    .select('profile_id')
    .eq('id', workerId)
    .maybeSingle();

  if (worker) {
    await supabase.rpc('create_notification', {
      target_profile_id: worker.profile_id,
      p_title: 'E-Waste Pickup Scheduled',
      p_message: `E-waste pickup scheduled for ${date}.`,
      p_type: 'ewaste',
    });
  }

  return data;
}