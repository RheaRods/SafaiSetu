import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { Card, PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/ui';
import MapView from '@/components/MapView';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Users, CheckCircle2, AlertTriangle, MapPin, Trash2, RefreshCw, X,
  TrendingUp, Activity, Ban, Check, Calendar, ChevronRight, ClipboardList, Route
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getTodayProgress, getMissedPickupQueue, getHotspotQueue, getEwasteRequests,
  assignRecoveryWorker, rejectMissedPickup, assignCleanupWorker,
  toggleWorkerActive, getWorkers, getWeeklyStats, scheduleEwaste, assignRoute, getHouseholdsInWard,
  getTodayTasks, rescheduleTask, getRoutesOverview
} from '@/services/supervisorService';
import type { Worker, HotspotReport, MissedPickup, EwasteRequest } from '@/types';

type Tab = 'overview' | 'progress' | 'tasks' | 'areas' | 'missed' | 'hotspots' | 'ewaste' | 'workers' | 'charts' | 'map';

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [progress, setProgress] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [missedQueue, setMissedQueue] = useState<any[]>([]);
  const [hotspotQueue, setHotspotQueue] = useState<(HotspotReport & { cleanup_assignments?: any[] })[]>([]);
  const [ewasteReqs, setEwasteReqs] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [stats, setStats] = useState<{ daily: any[]; statusBreakdown: any[] }>({ daily: [], statusBreakdown: [] });
  const [municipalityName, setMunicipalityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ type: 'recovery' | 'cleanup' | 'ewaste' | 'route'; id: string } | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ taskId: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
  if (!profile?.municipality_id) return;
  setLoading(true);
  try {
  const [prog, tasks, missed, hotspots, ewaste, wks, st, muni, routesOverview] = await Promise.all([
  getTodayProgress(profile.municipality_id),
  getTodayTasks(profile.municipality_id),
  getMissedPickupQueue(profile.municipality_id),
  getHotspotQueue(profile.municipality_id),
  getEwasteRequests(profile.municipality_id),
  getWorkers(profile.municipality_id),
  getWeeklyStats(profile.municipality_id),
  supabase.from('municipalities').select('name').eq('id', profile.municipality_id).maybeSingle(),
  getRoutesOverview(profile.municipality_id),
  ]);
  setProgress(prog || []);
  setTodayTasks(tasks || []);
  setRoutes(routesOverview || []);
  setMissedQueue(missed || []);
  setHotspotQueue(hotspots || []);
  setEwasteReqs(ewaste || []);
  setWorkers(wks || []);
  setStats(st);
  setMunicipalityName(muni.data?.name || '');
  } catch (err) {
  console.error(err);
  } finally {
  setLoading(false);
  }
  }, [profile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime subscription for collection_tasks, missed_pickups, hotspot_reports
  useEffect(() => {
  if (!profile?.municipality_id) return;
  const channel = supabase.channel('supervisor-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_tasks' }, () => fetchAll())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'missed_pickups' }, () => fetchAll())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'hotspot_reports' }, () => fetchAll())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ewaste_requests' }, () => fetchAll())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => fetchAll())
  .subscribe();

  return () => { channel.unsubscribe(); };
  }, [profile, fetchAll]);

  const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(null), 3000);
  };

  const handleAssignRecovery = async (missedPickupId: string, workerId: string) => {
  try {
  await assignRecoveryWorker(missedPickupId, workerId);
  showToast('Recovery worker assigned');
  setAssignModal(null);
  fetchAll();
  } catch (err) { showToast('Failed to assign'); }
  };

  const handleReject = async (id: string) => {
  try {
  await rejectMissedPickup(id);
  showToast('Complaint rejected');
  fetchAll();
  } catch (err) { showToast('Failed to reject'); }
  };

  const handleAssignCleanup = async (hotspotId: string, workerId: string) => {
  try {
  await assignCleanupWorker(hotspotId, workerId);
  showToast('Cleanup worker assigned');
  setAssignModal(null);
  fetchAll();
  } catch (err) { showToast('Failed to assign'); }
  };

  const handleScheduleEwaste = async (requestId: string, date: string, _workerId: string) => {
  try {
  await scheduleEwaste(requestId, date, _workerId);
  showToast('E-waste pickup scheduled');
  setAssignModal(null);
  fetchAll();
  } catch (err) { showToast('Failed to schedule'); }
  };

  const handleToggleWorker = async (workerId: string, isActive: boolean) => {
  try {
  await toggleWorkerActive(workerId, !isActive);
  showToast(isActive ? 'Worker deactivated' : 'Worker activated');
  fetchAll();
  } catch (err) { showToast('Failed to update worker'); }
  };

  const handleAssignRoute = async (workerId: string, dayOfWeek: string, startTime: string, endTime: string, householdIds: string[]) => {
    try {
      const worker = workers.find((w) => w.id === workerId);
      if (!worker?.assigned_ward_id) { showToast('This worker has no assigned ward'); return; }
      await assignRoute(worker.assigned_ward_id, workerId, dayOfWeek, startTime, endTime, householdIds);
      showToast('Route assigned successfully');
      setAssignModal(null);
      fetchAll();
    } catch (err) { showToast('Failed to assign route'); }
  };

  const handleReschedule = async (taskId: string, newDate: string, newWorkerId: string) => {
    try {
      await rescheduleTask(taskId, newDate, newWorkerId);
      showToast('Task rescheduled');
      setRescheduleModal(null);
      fetchAll();
    } catch (err) { showToast('Failed to reschedule task'); }
  };

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;

  const totalHouseholds = progress.reduce((sum, p) => sum + p.total, 0);
  const totalCollected = progress.reduce((sum, p) => sum + p.completed, 0);
  const totalMissed = missedQueue.filter((m) => m.status === 'reported').length;
  const totalHotspots = hotspotQueue.filter((h) => h.status !== 'resolved').length;
  const totalEwaste = ewasteReqs.filter((e) => e.status === 'requested').length;

  const tabs: [Tab, string, typeof Users][] = [
  ['overview', 'Overview', Activity],
  ['progress', 'Live Progress', TrendingUp],
  ['tasks', "Today's Tasks", ClipboardList],
  ['areas', 'Worker Areas', Route],
  ['missed', 'Missed Pickups', AlertTriangle],
  ['hotspots', 'Hotspots', MapPin],
  ['ewaste', 'E-Waste', Trash2],
  ['workers', 'Workers', Users],
  ['charts', 'Charts', TrendingUp],
  ['map', 'Map', MapPin],
  ];

  const hotspotMapMarkers = hotspotQueue
  .filter((h) => h.latitude && h.longitude)
  .map((h) => ({
  id: h.id,
  latitude: h.latitude!,
  longitude: h.longitude!,
  color: h.status === 'new' ? '#ef4444' : h.status === 'under_review' ? '#f97316' :
  h.status === 'cleanup_assigned' ? '#3b82f6' : h.status === 'resolved' ? '#10b981' : '#a855f7',
  popup: `<strong>${h.status.replace(/_/g, ' ')}</strong><br/>${h.description || 'No description'}<br/>Urgency: ${h.urgency}`,
  }));

  return (
  <AppShell>
  <PageHeader
  title="Supervisor Dashboard"
  subtitle={municipalityName || 'Supervisor Dashboard'}
  />

  {/* Stats overview cards */}
  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
  <StatCard icon={Users} label="Households" value={totalHouseholds} color="blue" />
  <StatCard icon={CheckCircle2} label="Collected" value={totalCollected} color="emerald" />
  <StatCard icon={AlertTriangle} label="Missed" value={totalMissed} color="red" />
  <StatCard icon={MapPin} label="Hotspots" value={totalHotspots} color="orange" />
  <StatCard icon={Trash2} label="E-Waste" value={totalEwaste} color="teal" />
  </div>

  {/* Tabs */}
  <div className="flex gap-1 mb-6 bg-sand-light p-1 rounded-lg overflow-x-auto">
  {tabs.map(([key, label, Icon]) => (
  <button
  key={key}
  onClick={() => setTab(key)}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${
  tab === key ? 'bg-white text-ink ' : 'text-ink/50 hover:text-ink/70'
  }`}
  >
  <Icon className="w-4 h-4" />
  {label}
  {key === 'missed' && totalMissed > 0 && <Badge color="bg-brick">{totalMissed}</Badge>}
  {key === 'hotspots' && totalHotspots > 0 && <Badge color="bg-orange-500">{totalHotspots}</Badge>}
  {key === 'ewaste' && totalEwaste > 0 && <Badge color="bg-forest">{totalEwaste}</Badge>}
  </button>
  ))}
  </div>

  {tab === 'overview' && (
  <div className="space-y-4">
  {/* Live progress summary */}
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-4">Live Worker Progress</h3>
  <div className="space-y-3">
  {progress.length === 0 ? (
  <EmptyState icon={TrendingUp} title="No active workers" message="No workers are on duty right now." />
  ) : (
  progress.map((p) => (
  <div key={p.worker.id} className="flex items-center gap-4">
  <div className="w-10 h-10 rounded-full bg-clay/5 flex items-center justify-center flex-shrink-0">
  <span className="text-sm font-bold text-clay-dark">
  {p.profile?.full_name?.charAt(0) || 'W'}
  </span>
  </div>
  <div className="flex-1 min-w-0">
  <div className="flex items-center justify-between mb-1">
  <span className="text-sm font-medium text-ink">{p.profile?.full_name}</span>
  <span className="text-xs text-ink/40">{p.completed}/{p.total} done</span>
  </div>
  <div className="h-2 rounded-full bg-sand-light overflow-hidden">
  <div
  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
  style={{ width: `${p.total > 0 ? (p.completed / p.total) * 100 : 0}%` }}
  />
  </div>
  </div>
  </div>
  ))
  )}
  </div>
  </Card>

  {/* Recent missed pickups */}
  <Card className="p-5">
  <div className="flex items-center justify-between mb-3">
  <h3 className="font-semibold text-ink">Recent Complaints</h3>
  <button onClick={() => setTab('missed')} className="text-xs text-forest font-medium hover:underline flex items-center gap-1">
  View all <ChevronRight className="w-3 h-3" />
  </button>
  </div>
  {missedQueue.length === 0 ? (
  <p className="text-sm text-ink/40 py-4 text-center">No complaints reported</p>
  ) : (
  <div className="space-y-2">
  {missedQueue.slice(0, 3).map((m) => (
  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-paper">
  <div className="min-w-0">
  <p className="text-sm font-medium text-ink/70 truncate">{m.household?.address_line}</p>
  <p className="text-xs text-ink/40">{m.reason.replace(/_/g, ' ')}</p>
  </div>
  <StatusBadge status={m.status} />
  </div>
  ))}
  </div>
  )}
  </Card>
  </div>
  )}

  {tab === 'progress' && (
  <div className="space-y-3">
  {progress.length === 0 ? (
  <EmptyState icon={TrendingUp} title="No data" message="No worker progress data available." />
  ) : (
  progress.map((p) => (
  <Card key={p.worker.id} className="p-5">
  <div className="flex items-center gap-3 mb-3">
  <div className="w-11 h-11 rounded-full bg-clay/10 flex items-center justify-center">
  <span className="font-bold text-clay-dark">{p.profile?.full_name?.charAt(0)}</span>
  </div>
  <div className="flex-1">
  <p className="font-semibold text-ink">{p.profile?.full_name}</p>
  <p className="text-xs text-ink/40">{p.total} households assigned</p>
  </div>
  </div>
  <div className="grid grid-cols-3 gap-3 mb-3">
  <div className="text-center p-2 rounded-lg bg-forest/5">
  <p className="text-xl font-bold text-forest-dark">{p.completed}</p>
  <p className="text-xs text-forest">Completed</p>
  </div>
  <div className="text-center p-2 rounded-lg bg-clay/5">
  <p className="text-xl font-bold text-clay-dark">{p.pending}</p>
  <p className="text-xs text-clay-dark">Pending</p>
  </div>
  <div className="text-center p-2 rounded-lg bg-brick/5">
  <p className="text-xl font-bold text-brick">{p.missed}</p>
  <p className="text-xs text-brick">Issues</p>
  </div>
  </div>
  <div className="h-2.5 rounded-full bg-sand-light overflow-hidden">
  <div
  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
  style={{ width: `${p.total > 0 ? (p.completed / p.total) * 100 : 0}%` }}
  />
  </div>
  </Card>
  ))
  )}
  </div>
  )}

  {tab === 'tasks' && (
  <div className="space-y-3">
  {todayTasks.length === 0 ? (
  <EmptyState icon={ClipboardList} title="No tasks today" message="No collection tasks are scheduled for today." />
  ) : (
  todayTasks.map((t) => (
  <Card key={t.id} className="p-4">
  <div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
  <p className="font-semibold text-ink truncate">{t.household?.address_line}</p>
  {t.household?.landmark && <p className="text-sm text-ink/40">{t.household.landmark}</p>}
  <p className="text-xs text-ink/50 mt-1">
  {t.worker?.profile?.full_name || 'Unassigned'} • {t.scheduled_date}
  </p>
  {t.worker_note && <p className="text-sm text-ink/60 mt-1.5">{t.worker_note}</p>}
  </div>
  <StatusBadge status={t.status} />
  </div>
  {t.status !== 'collected' && (
  <button
  onClick={() => setRescheduleModal({ taskId: t.id })}
  className="w-full flex items-center justify-center gap-1.5 bg-clay hover:bg-clay-dark text-white text-sm font-medium py-2 rounded-lg transition mt-3"
  >
  <RefreshCw className="w-4 h-4" />
  Reschedule
  </button>
  )}
  </Card>
  ))
  )}
  </div>
  )}

  {tab === 'areas' && (
  <div className="space-y-3">
  {workers.length === 0 ? (
  <EmptyState icon={Route} title="No workers" message="Add workers before assigning areas." />
  ) : (
  workers.map((w) => {
  const workerRoutes = routes.filter((r) => r.worker_id === w.id);
  return <WorkerAreaCard key={w.id} worker={w} routes={workerRoutes} />;
  })
  )}
  </div>
  )}

  {tab === 'missed' && (
  <div className="space-y-3">
  {missedQueue.length === 0 ? (
  <EmptyState icon={AlertTriangle} title="No complaints" message="No missed pickup complaints reported." />
  ) : (
  missedQueue.map((m) => (
  <Card key={m.id} className="p-4">
  <div className="flex items-start justify-between mb-2">
  <div>
  <p className="font-semibold text-ink">{m.household?.address_line}</p>
  {m.household?.landmark && <p className="text-sm text-ink/40">{m.household.landmark}</p>}
  <p className="text-xs text-ink/50 mt-1">
  {m.reason.replace(/_/g, ' ')} • {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
  </p>
  {m.description && <p className="text-sm text-ink/60 mt-1.5">{m.description}</p>}
  </div>
  <StatusBadge status={m.status} />
  </div>
  {m.status === 'reported' && (
  <div className="flex gap-2 mt-3">
  <button
  onClick={() => setAssignModal({ type: 'recovery', id: m.id })}
  className="flex-1 flex items-center justify-center gap-1.5 bg-clay hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
  >
  <RefreshCw className="w-4 h-4" />
  Assign Recovery
  </button>
  <button
  onClick={() => handleReject(m.id)}
  className="flex items-center justify-center gap-1.5 bg-sand-light hover:bg-gray-200 text-ink/70 text-sm font-medium px-4 py-2 rounded-lg transition"
  >
  <X className="w-4 h-4" />
  Reject
  </button>
  </div>
  )}
  {m.assigned_worker && (
  <p className="text-xs text-clay mt-2">
  Assigned to: {m.assigned_worker.profile?.full_name || 'A worker'}
  </p>
  )}
  </Card>
  ))
  )}
  </div>
  )}

  {tab === 'hotspots' && (
  <div className="space-y-3">
  {hotspotQueue.length === 0 ? (
  <EmptyState icon={MapPin} title="No hotspots" message="No hotspot reports in your area." />
  ) : (
  hotspotQueue.map((h) => (
  <Card key={h.id} className="p-4">
  <div className="flex items-start justify-between mb-2">
  <div className="flex-1">
  <div className="flex items-center gap-2 mb-1">
  <StatusBadge status={h.status} />
  {h.recurrence_count > 1 && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ink/10 text-ink/70">
  Recurring ({h.recurrence_count}x)
  </span>
  )}
  </div>
  <p className="text-sm text-ink/70 mt-1.5">{h.description}</p>
  <div className="flex items-center gap-3 mt-2 text-xs text-ink/40">
  <span>Category: {h.waste_category.replace(/_/g, ' ')}</span>
  <span>Urgency: <span className={h.urgency === 'high' ? 'text-brick font-medium' : h.urgency === 'medium' ? 'text-clay-dark' : 'text-forest'}>{h.urgency}</span></span>
  <span>{new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
  </div>
  </div>
  </div>
  {(h.photo_url || h.cleanup_assignments?.[0]?.completion_photo_url) && (
  <div className="flex gap-2 mb-2">
  {h.photo_url && (
  <a href={h.photo_url} target="_blank" rel="noopener noreferrer" className="block">
  <img src={h.photo_url} alt="Reported dump" className="w-20 h-20 object-cover rounded-lg border border-sand-dark" />
  <p className="text-[10px] text-ink/40 mt-0.5 text-center">Reported</p>
  </a>
  )}
  {h.cleanup_assignments?.[0]?.completion_photo_url && (
  <a href={h.cleanup_assignments[0].completion_photo_url} target="_blank" rel="noopener noreferrer" className="block">
  <img src={h.cleanup_assignments[0].completion_photo_url} alt="Cleanup evidence" className="w-20 h-20 object-cover rounded-lg border border-forest" />
  <p className="text-[10px] text-forest mt-0.5 text-center">Cleaned</p>
  </a>
  )}
  </div>
  )}
  {h.latitude && h.longitude && (
  <p className="text-xs text-ink/40 mb-2">Location: {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</p>
  )}
  {(h.status === 'new' || h.status === 'under_review') && (
  <button
  onClick={() => setAssignModal({ type: 'cleanup', id: h.id })}
  className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 rounded-lg transition"
  >
  <Trash2 className="w-4 h-4" />
  Assign Cleanup Worker
  </button>
  )}
  </Card>
  ))
  )}
  </div>
  )}

  {tab === 'ewaste' && (
  <div className="space-y-3">
  {ewasteReqs.length === 0 ? (
  <EmptyState icon={Trash2} title="No requests" message="No e-waste pickup requests." />
  ) : (
  ewasteReqs.map((e) => (
  <Card key={e.id} className="p-4">
  <div className="flex items-start justify-between">
  <div>
  <p className="font-semibold text-ink">{e.item_description}</p>
  {e.preferred_date && <p className="text-sm text-ink/40 mt-0.5">Preferred: {e.preferred_date}</p>}
  <p className="text-xs text-ink/50 mt-1">{e.household?.address_line}</p>
  </div>
  <StatusBadge status={e.status} />
  </div>
  {e.status === 'requested' && (
  <button
  onClick={() => setAssignModal({ type: 'ewaste', id: e.id })}
  className="mt-3 w-full flex items-center justify-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-sm font-medium py-2 rounded-lg transition"
  >
  <Calendar className="w-4 h-4" />
  Schedule Pickup
  </button>
  )}
  </Card>
  ))
  )}
  </div>
  )}

      {tab === 'workers' && (
        <div className="space-y-3">
          {workers.length === 0 ? (
            <EmptyState icon={Users} title="No workers" message="No workers registered in your municipality." />
          ) : (
            workers.map((w) => (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.is_active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <span className={`font-bold ${w.is_active ? 'text-blue-700' : 'text-gray-400'}`}>
                        {w.profile?.full_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{w.profile?.full_name}</p>
                      <p className="text-xs text-gray-400">{w.profile?.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                      {w.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => setAssignModal({ type: 'route', id: w.id })}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition"
                      title="Assign route"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleWorker(w.id, w.is_active)}
                      className={`p-2 rounded-lg transition ${w.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                    >
                      {w.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

  {tab === 'charts' && (
  <div className="space-y-4">
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-4">Daily Collection (This Week)</h3>
  {stats.daily.length === 0 ? (
  <EmptyState icon={BarChart} title="No data" message="No collection data for this week." />
  ) : (
  <ResponsiveContainer width="100%" height={250}>
  <BarChart data={stats.daily}>
  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
  <Tooltip />
  <Bar dataKey="collected" fill="#10b981" name="Collected" radius={[4, 4, 0, 0]} />
  <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[4, 4, 0, 0]} />
  <Bar dataKey="scheduled" fill="#f59e0b" name="Scheduled" radius={[4, 4, 0, 0]} />
  </BarChart>
  </ResponsiveContainer>
  )}
  </Card>

  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-4">Collection Status Breakdown</h3>
  {stats.statusBreakdown.every((s) => s.value === 0) ? (
  <EmptyState icon={BarChart} title="No data" message="No status data available." />
  ) : (
  <ResponsiveContainer width="100%" height={250}>
  <PieChart>
  <Pie
  data={stats.statusBreakdown.filter((s) => s.value > 0)}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  outerRadius={90}
  label={(entry: any) => `${entry.name}: ${entry.value}`}
  >
  {stats.statusBreakdown.filter((s) => s.value > 0).map((entry, i) => (
  <Cell key={i} fill={entry.color} />
  ))}
  </Pie>
  <Tooltip />
  </PieChart>
  </ResponsiveContainer>
  )}
  </Card>
  </div>
  )}

  {tab === 'map' && (
  <Card className="p-4">
  <h3 className="font-semibold text-ink mb-3">Hotspot Map</h3>
  {hotspotMapMarkers.length === 0 ? (
  <EmptyState icon={MapPin} title="No hotspots" message="No hotspot locations to display on the map." />
  ) : (
  <>
  <div className="flex gap-3 mb-3 text-xs flex-wrap">
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brick"></span>New</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span>Under Review</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-clay"></span>Assigned</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-forest"></span>Resolved</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span>Recurring</span>
  </div>
  <MapView center={[15.5912, 73.7947]} markers={hotspotMapMarkers} height={400} zoom={14} />
  </>
  )}
  </Card>
  )}

      {assignModal && assignModal.type !== 'route' && (
        <AssignModal
          type={assignModal.type as 'recovery' | 'cleanup' | 'ewaste'}
          workers={workers}
          onClose={() => setAssignModal(null)}
          onAssign={assignModal.type === 'recovery'
            ? (wid) => handleAssignRecovery(assignModal.id, wid)
            : assignModal.type === 'cleanup'
            ? (wid) => handleAssignCleanup(assignModal.id, wid)
            : (wid, date) => handleScheduleEwaste(assignModal.id, date || new Date().toISOString().split('T')[0], wid)
          }
        />
      )}

      {assignModal && assignModal.type === 'route' && (
        <RouteAssignModal
          workerId={assignModal.id}
          workers={workers}
          onClose={() => setAssignModal(null)}
          onAssign={handleAssignRoute}
        />
      )}

      {rescheduleModal && (
        <RescheduleModal
          task={todayTasks.find((t) => t.id === rescheduleModal.taskId)}
          workers={workers}
          onClose={() => setRescheduleModal(null)}
          onReschedule={handleReschedule}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
  blue: 'bg-clay/5 text-clay',
  emerald: 'bg-forest/5 text-forest',
  red: 'bg-brick/5 text-brick',
  orange: 'bg-orange-50 text-orange-600',
  teal: 'bg-moss/10 text-forest',
  };
  return (
  <div className="glass rounded-lg border border-white/50 p-4">
  <div className="flex items-center gap-2">
  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
  <Icon className="w-4 h-4" />
  </div>
  <div>
  <p className="text-2xl font-bold text-ink">{value}</p>
  <p className="text-xs text-ink/40">{label}</p>
  </div>
  </div>
  </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`ml-1 px-1.5 py-0.5 rounded-full ${color} text-white text-[10px] font-bold`}>{children}</span>;
}

function AssignModal({ type, workers, onClose, onAssign }: {
  type: 'recovery' | 'cleanup' | 'ewaste';
  workers: any[];
  onClose: () => void;
  onAssign: (workerId: string, date?: string) => void;
}) {
  const [selectedWorker, setSelectedWorker] = useState('');
  const [date, setDate] = useState('');

  const activeWorkers = workers.filter((w) => w.is_active);
  const title = type === 'recovery' ? 'Assign Recovery Worker' : type === 'cleanup' ? 'Assign Cleanup Worker' : 'Schedule E-Waste Pickup';

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
  <div className="flex items-center justify-between p-5 border-b border-sand">
  <h2 className="font-semibold text-ink">{title}</h2>
  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-light transition">
  <X className="w-5 h-5 text-ink/50" />
  </button>
  </div>
  <div className="p-5 space-y-4">
  {type === 'ewaste' && (
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-1.5">Pickup Date</label>
  <input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  min={new Date().toISOString().split('T')[0]}
  className="w-full p-2.5 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
  />
  </div>
  )}
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-2">Select Worker</label>
  {activeWorkers.length === 0 ? (
  <p className="text-sm text-ink/40">No active workers available</p>
  ) : (
  <div className="space-y-2">
  {activeWorkers.map((w) => (
  <button
  key={w.id}
  onClick={() => setSelectedWorker(w.id)}
  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
  selectedWorker === w.id ? 'border-forest bg-moss/10' : 'border-sand hover:border-sand-dark'
  }`}
  >
  <div className="w-9 h-9 rounded-full bg-clay/10 flex items-center justify-center">
  <span className="text-sm font-bold text-clay-dark">{w.profile?.full_name?.charAt(0)}</span>
  </div>
  <div className="text-left">
  <p className="text-sm font-medium text-ink/70">{w.profile?.full_name}</p>
  <p className="text-xs text-ink/40">{w.profile?.phone || 'No phone'}</p>
  </div>
  </button>
  ))}
  </div>
  )}
  </div>
  <button
  onClick={() => selectedWorker && onAssign(selectedWorker, date)}
  disabled={!selectedWorker}
  className="w-full bg-forest hover:bg-forest-dark text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
  >
  Confirm Assignment
  </button>
  </div>
  </div>
  </div>
  );
}

function RouteAssignModal({ workerId, workers, onClose, onAssign }: {
  workerId: string;
  workers: any[];
  onClose: () => void;
  onAssign: (workerId: string, dayOfWeek: string, startTime: string, endTime: string, householdIds: string[]) => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState('monday');
  const [startTime, setStartTime] = useState('06:30');
  const [endTime, setEndTime] = useState('08:00');
  const [households, setHouseholds] = useState<{ id: string; address_line: string; landmark: string | null }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const worker = workers.find((w) => w.id === workerId);
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    let cancelled = false;
    async function loadHouseholds() {
      if (!worker?.assigned_ward_id) {
        setLoadingHouseholds(false);
        return;
      }
      setLoadingHouseholds(true);
      setFetchError(false);
      try {
        const data = await getHouseholdsInWard(worker.assigned_ward_id);
        if (cancelled) return;
        setHouseholds(data || []);
        setSelectedIds(new Set((data || []).map((h) => h.id))); // default: everyone selected, supervisor can deselect
      } catch (err) {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoadingHouseholds(false);
      }
    }
    loadHouseholds();
    return () => { cancelled = true; };
  }, [worker?.assigned_ward_id]);

  const toggleHousehold = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = households.length > 0 && selectedIds.size === households.length;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(households.map((h) => h.id)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-sand">
          <h2 className="font-semibold text-ink">Assign Route to {worker?.profile?.full_name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-light transition">
            <X className="w-5 h-5 text-ink/50" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">Day of Week</label>
            <div className="grid grid-cols-4 gap-2">
              {days.map((d) => (
                <button
                  key={d}
                  onClick={() => setDayOfWeek(d)}
                  className={`p-2 rounded-lg border-2 text-xs font-medium capitalize transition ${
                    dayOfWeek === d ? 'border-forest bg-moss/10 text-forest' : 'border-sand text-ink/50'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1.5">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink/70">Households on this Route</label>
              {households.length > 0 && (
                <button onClick={toggleAll} className="text-xs font-medium text-forest hover:underline">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {!worker?.assigned_ward_id ? (
              <p className="text-sm text-brick">This worker has no assigned ward, so households can't be loaded.</p>
            ) : loadingHouseholds ? (
              <p className="text-sm text-ink/40">Loading households…</p>
            ) : fetchError ? (
              <p className="text-sm text-brick">Couldn't load households. Close and reopen this dialog to retry.</p>
            ) : households.length === 0 ? (
              <p className="text-sm text-ink/40">No households found in this worker's ward.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 border border-sand rounded-lg p-2">
                {households.map((h) => (
                  <label
                    key={h.id}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-sand-light cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(h.id)}
                      onChange={() => toggleHousehold(h.id)}
                      className="mt-0.5 accent-forest"
                    />
                    <span>
                      <span className="block text-sm text-ink/80">{h.address_line}</span>
                      {h.landmark && <span className="block text-xs text-ink/40">{h.landmark}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-ink/40 mt-1.5">{selectedIds.size} of {households.length} households selected</p>
          </div>

          <button
            onClick={() => onAssign(workerId, dayOfWeek, startTime, endTime, Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className="w-full bg-forest hover:bg-forest-dark text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            Assign Route ({selectedIds.size} household{selectedIds.size === 1 ? '' : 's'})
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ task, workers, onClose, onReschedule }: {
  task: any;
  workers: any[];
  onClose: () => void;
  onReschedule: (taskId: string, newDate: string, newWorkerId: string) => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [newDate, setNewDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [newWorkerId, setNewWorkerId] = useState(task?.worker_id || '');

  const activeWorkers = workers.filter((w) => w.is_active);

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-sand">
          <h2 className="font-semibold text-ink">Reschedule Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-light transition">
            <X className="w-5 h-5 text-ink/50" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-ink/70">{task.household?.address_line}</p>
            {task.household?.landmark && <p className="text-xs text-ink/40">{task.household.landmark}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1.5">New Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-2.5 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">Assign To</label>
            {activeWorkers.length === 0 ? (
              <p className="text-sm text-ink/40">No active workers available</p>
            ) : (
              <div className="space-y-2">
                {activeWorkers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setNewWorkerId(w.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      newWorkerId === w.id ? 'border-forest bg-moss/10' : 'border-sand hover:border-sand-dark'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-clay/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-clay-dark">{w.profile?.full_name?.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink/70">{w.profile?.full_name}</p>
                      {w.id === task.worker_id && <p className="text-xs text-forest">Currently assigned</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => newWorkerId && onReschedule(task.id, newDate, newWorkerId)}
            disabled={!newWorkerId}
            className="w-full bg-forest hover:bg-forest-dark text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            Reschedule Task
          </button>
        </div>
      </div>
    </div>
  );
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function WorkerAreaCard({ worker, routes }: { worker: any; routes: any[] }) {
  const availableDays = DAY_ORDER.filter((d) => routes.some((r) => r.day_of_week === d));
  const [selectedDay, setSelectedDay] = useState(availableDays[0] || 'monday');
  const dayRoutes = routes.filter((r) => r.day_of_week === selectedDay);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-clay/10 flex items-center justify-center flex-shrink-0">
          <span className="font-bold text-clay-dark">{worker.profile?.full_name?.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink truncate">{worker.profile?.full_name}</p>
          <p className="text-xs text-ink/40">{worker.assigned_ward?.name ? `Ward: ${worker.assigned_ward.name}` : 'No ward assigned'}</p>
        </div>
        {!worker.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-sand text-ink/50 flex-shrink-0">Inactive</span>}
      </div>
      {routes.length === 0 ? (
        <p className="text-sm text-ink/40">No area/route assigned yet.</p>
      ) : (
        <>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-full mb-2 px-3 py-2 rounded-lg border border-sand-dark bg-white text-sm capitalize outline-none focus:border-forest"
          >
            {availableDays.map((d) => (
              <option key={d} value={d} className="capitalize">
                {d.charAt(0).toUpperCase() + d.slice(1)} ({routes.filter((r) => r.day_of_week === d).length})
              </option>
            ))}
          </select>
          <div className="space-y-2">
            {dayRoutes.map((r) => (
              <RouteRow key={r.id} route={r} />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function RouteRow({ route }: { route: any }) {
  const [expanded, setExpanded] = useState(false);
  const households = (route.route_households || [])
    .map((rh: any) => rh.household)
    .filter(Boolean);

  return (
    <div className="p-3 rounded-lg bg-paper">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink capitalize">{route.day_of_week}</p>
          <p className="text-xs text-ink/40">
            {route.collection_window_start}–{route.collection_window_end} • {route.ward?.name} • {households.length} household{households.length === 1 ? '' : 's'}
          </p>
        </div>
        {households.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-forest font-medium hover:underline flex-shrink-0">
            {expanded ? 'Hide' : 'View'} list
          </button>
        )}
      </div>
      {expanded && (
        <ul className="mt-2 pt-2 border-t border-sand-dark space-y-1">
          {households.map((h: any) => (
            <li key={h.id} className="text-xs text-ink/60">
              {h.address_line}{h.landmark ? ` • ${h.landmark}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}