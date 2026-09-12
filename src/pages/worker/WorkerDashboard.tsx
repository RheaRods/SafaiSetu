import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { Card, PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/ui';
import MapView from '@/components/MapView';
import {
  Route as RouteIcon, CheckCircle2, XCircle, MapPin, Clock, Users,
  AlertTriangle, RefreshCw, Trash2, Camera, X
} from 'lucide-react';
import { getWorkerByProfile, getTodayTasks, updateTaskStatus, getRecoveryAssignments, completeRecovery, getCleanupAssignments, completeCleanup } from '@/services/workerService';
import { supabase } from '@/lib/supabase';
import type { Worker, CollectionStatus } from '@/types';

type Tab = 'tasks' | 'recovery' | 'cleanup' | 'map';

export default function WorkerDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('tasks');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [cleanups, setCleanups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [obstacleModal, setObstacleModal] = useState<string | null>(null);
  const [cleanupModal, setCleanupModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
  if (!profile) return;
  setLoading(true);
  try {
  const w = await getWorkerByProfile(profile.id);
  setWorker(w);
  if (w) {
  const [t, r, c] = await Promise.all([
  getTodayTasks(w.id),
  getRecoveryAssignments(w.id),
  getCleanupAssignments(w.id),
  ]);
  setTasks(t || []);
  setRecoveries(r || []);
  setCleanups(c || []);
  }
  } catch (err) {
  console.error(err);
  } finally {
  setLoading(false);
  }
  }, [profile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: update when tasks, missed pickups, or cleanup assignments change
  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel('worker-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_tasks' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missed_pickups' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanup_assignments' }, () => fetchAll())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [profile, fetchAll]);

  const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(null), 3000);
  };

  const getPosition = (): Promise<{ lat?: number; lng?: number }> => {
  return new Promise((resolve) => {
  if (!navigator.geolocation) { resolve({}); return; }
  navigator.geolocation.getCurrentPosition(
  (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
  () => resolve({}),
  { timeout: 3000 }
  );
  });
  };

  const handleCollect = async (taskId: string) => {
  const { lat, lng } = await getPosition();
  try {
  await updateTaskStatus(taskId, 'collected', undefined, lat, lng);
  showToast('Collection recorded successfully');
  fetchAll();
  } catch (err) {
  showToast('Failed to update. Please try again.');
  }
  };

  const handleObstacle = async (taskId: string, status: CollectionStatus, note: string) => {
  try {
  await updateTaskStatus(taskId, status, note);
  showToast('Status updated');
  setObstacleModal(null);
  fetchAll();
  } catch (err) {
  showToast('Failed to update');
  }
  };

  const handleCompleteRecovery = async (id: string) => {
  try {
  await completeRecovery(id);
  showToast('Recovery completed');
  fetchAll();
  } catch (err) {
  showToast('Failed to complete recovery');
  }
  };

  const handleCompleteCleanup = async (id: string, photoUrl?: string) => {
    try {
      await completeCleanup(id, photoUrl);
      showToast('Cleanup completed');
      setCleanupModal(null);
      fetchAll();
    } catch (err) {
      showToast('Failed to complete cleanup');
    }
  };

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (!worker) return (
  <AppShell>
  <EmptyState icon={Trash2} title="Not registered as worker" message="Please contact your supervisor to be added as a worker." />
  </AppShell>
  );

  const completed = tasks.filter((t) => t.status === 'collected').length;
  const pending = tasks.filter((t) => t.status === 'scheduled').length;
  const missed = tasks.filter((t) => ['missed', 'unavailable', 'inaccessible'].includes(t.status)).length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const mapMarkers = tasks
  .filter((t) => t.household?.latitude && t.household?.longitude)
  .map((t) => ({
  id: t.id,
  latitude: t.household.latitude,
  longitude: t.household.longitude,
  title: t.household.address_line,
  color: t.status === 'collected' ? '#10b981' : t.status === 'scheduled' ? '#f59e0b' : '#ef4444',
  popup: `<strong>${t.household.address_line}</strong><br/>${t.status.replace(/_/g, ' ')}`,
  }));

  const tabs: [Tab, string, typeof RouteIcon][] = [
  ['tasks', 'Tasks', RouteIcon],
  ['recovery', 'Recovery', RefreshCw],
  ['cleanup', 'Cleanup', Trash2],
  ['map', 'Map', MapPin],
  ];

  return (
  <AppShell>
  <PageHeader
  title={`Hello, ${profile?.full_name?.split(' ')[0]}`}
  subtitle={worker.assigned_ward ? `${worker.assigned_ward.name} • ${worker.municipality?.name || ''}` : 'Worker Dashboard'}
  />

  {/* Stats cards */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
  <div className="glass rounded-lg border border-white/50 p-4">
  <div className="flex items-center gap-2">
  <div className="w-9 h-9 rounded-lg bg-clay/5 flex items-center justify-center">
  <Users className="w-4 h-4 text-clay" />
  </div>
  <div>
  <p className="text-2xl font-bold text-ink">{total}</p>
  <p className="text-xs text-ink/40">Total</p>
  </div>
  </div>
  </div>
  <div className="glass rounded-lg border border-white/50 p-4">
  <div className="flex items-center gap-2">
  <div className="w-9 h-9 rounded-lg bg-forest/5 flex items-center justify-center">
  <CheckCircle2 className="w-4 h-4 text-forest" />
  </div>
  <div>
  <p className="text-2xl font-bold text-ink">{completed}</p>
  <p className="text-xs text-ink/40">Done</p>
  </div>
  </div>
  </div>
  <div className="glass rounded-lg border border-white/50 p-4">
  <div className="flex items-center gap-2">
  <div className="w-9 h-9 rounded-lg bg-clay/5 flex items-center justify-center">
  <Clock className="w-4 h-4 text-clay-dark" />
  </div>
  <div>
  <p className="text-2xl font-bold text-ink">{pending}</p>
  <p className="text-xs text-ink/40">Pending</p>
  </div>
  </div>
  </div>
  <div className="glass rounded-lg border border-white/50 p-4">
  <div className="flex items-center gap-2">
  <div className="w-9 h-9 rounded-lg bg-brick/5 flex items-center justify-center">
  <XCircle className="w-4 h-4 text-brick" />
  </div>
  <div>
  <p className="text-2xl font-bold text-ink">{missed}</p>
  <p className="text-xs text-ink/40">Issues</p>
  </div>
  </div>
  </div>
  </div>

  {/* Progress bar */}
  {total > 0 && (
  <Card className="p-4 mb-6">
  <div className="flex items-center justify-between mb-2">
  <span className="text-sm font-medium text-ink/70">Today's Progress</span>
  <span className="text-sm font-bold text-forest">{progress}%</span>
  </div>
  <div className="h-3 rounded-full bg-sand-light overflow-hidden">
  <div
  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
  style={{ width: `${progress}%` }}
  />
  </div>
  </Card>
  )}

  {/* Tabs */}
  <div className="flex gap-1 mb-6 bg-sand-light p-1 rounded-lg w-fit overflow-x-auto">
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
  {key === 'recovery' && recoveries.length > 0 && (
  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-clay text-white text-[10px] font-bold">{recoveries.length}</span>
  )}
  {key === 'cleanup' && cleanups.length > 0 && (
  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">{cleanups.length}</span>
  )}
  </button>
  ))}
  </div>

  {tab === 'tasks' && (
  <div className="space-y-3">
  {tasks.length === 0 ? (
  <EmptyState icon={RouteIcon} title="No tasks today" message="You have no collection tasks scheduled for today." />
  ) : (
  tasks.map((task, idx) => (
  <TaskCard
  key={task.id}
  task={task}
  index={idx + 1}
  onCollect={() => handleCollect(task.id)}
  onObstacle={() => setObstacleModal(task.id)}
  />
  ))
  )}
  </div>
  )}

  {tab === 'recovery' && (
  <div className="space-y-3">
  {recoveries.length === 0 ? (
  <EmptyState icon={RefreshCw} title="No recovery tasks" message="No missed pickup recovery assignments right now." />
  ) : (
  recoveries.map((r) => (
  <Card key={r.id} className="p-4">
  <div className="flex items-start justify-between">
  <div>
  <p className="font-semibold text-ink">{r.household?.address_line}</p>
  {r.household?.landmark && <p className="text-sm text-ink/40">{r.household.landmark}</p>}
  <p className="text-xs text-ink/50 mt-1">Reason: {r.reason.replace(/_/g, ' ')}</p>
  {r.description && <p className="text-xs text-ink/40 mt-1">{r.description}</p>}
  </div>
  <StatusBadge status={r.status} />
  </div>
  <button
  onClick={() => handleCompleteRecovery(r.id)}
  className="mt-3 w-full flex items-center justify-center gap-2 bg-clay hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
  >
  <CheckCircle2 className="w-4 h-4" />
  Mark Recovery Complete
  </button>
  </Card>
  ))
  )}
  </div>
  )}

      {tab === 'cleanup' && (
        <div className="space-y-3">
          {cleanups.length === 0 ? (
            <EmptyState icon={Trash2} title="No cleanup tasks" message="No hotspot cleanup assignments right now." />
          ) : (
            cleanups.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-ink">Hotspot Cleanup</p>
                    {c.hotspot?.description && <p className="text-sm text-ink/40 mt-1">{c.hotspot.description}</p>}
                    {c.hotspot?.latitude && c.hotspot?.longitude && (
                      <p className="text-xs text-ink/40 mt-1">
                        Location: {c.hotspot.latitude.toFixed(4)}, {c.hotspot.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <button
                  onClick={() => setCleanupModal(c.id)}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition"
                >
                  <Camera className="w-4 h-4" />
                  Complete Cleanup
                </button>
              </Card>
            ))
          )}
        </div>
      )}

  {tab === 'map' && (
  <Card className="p-4">
  <h3 className="font-semibold text-ink mb-3">Route Map</h3>
  {mapMarkers.length === 0 ? (
  <EmptyState icon={MapPin} title="No locations" message="No household locations available to display." />
  ) : (
  <>
  <div className="flex gap-3 mb-3 text-xs">
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-forest"></span>Collected</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-clay/50"></span>Pending</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-brick"></span>Missed</span>
  </div>
  <MapView center={[15.5912, 73.7947]} markers={mapMarkers} height={400} zoom={15} />
  </>
  )}
  </Card>
  )}

  {obstacleModal && (
  <ObstacleModal
  onClose={() => setObstacleModal(null)}
  onSubmit={(status, note) => handleObstacle(obstacleModal, status, note)}
  />
  )}

      {cleanupModal && (
        <CleanupModal
          onClose={() => setCleanupModal(null)}
          onComplete={(photoUrl) => handleCompleteCleanup(cleanupModal, photoUrl)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-ink text-white text-sm font-medium ">
          {toast}
        </div>
      )}
    </AppShell>
  );
}

function TaskCard({ task, index, onCollect, onObstacle }: { task: any; index: number; onCollect: () => void; onObstacle: () => void }) {
  const isDone = task.status !== 'scheduled';
  const statusColors: Record<string, string> = {
  collected: 'border-l-emerald-500',
  missed: 'border-l-red-500',
  unavailable: 'border-l-orange-500',
  inaccessible: 'border-l-orange-500',
  scheduled: 'border-l-amber-500',
  in_progress: 'border-l-blue-500',
  };

  return (
  <Card className={`p-4 border-l-4 ${statusColors[task.status] || 'border-l-gray-300'}`}>
  <div className="flex items-start gap-3">
  <div className="w-9 h-9 rounded-lg bg-sand-light flex items-center justify-center flex-shrink-0">
  <span className="text-sm font-bold text-ink/60">{index}</span>
  </div>
  <div className="flex-1 min-w-0">
  <p className="font-semibold text-ink">{task.household?.address_line}</p>
  {task.household?.landmark && <p className="text-sm text-ink/40">{task.household.landmark}</p>}
  <div className="flex items-center gap-2 mt-2">
  <StatusBadge status={task.status} />
  {task.completed_at && (
  <span className="text-xs text-ink/40">
  {new Date(task.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
  </span>
  )}
  </div>
  </div>
  </div>

  {!isDone && (
  <div className="flex gap-2 mt-3">
  <button
  onClick={onCollect}
  className="flex-1 flex items-center justify-center gap-1.5 bg-forest hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
  >
  <CheckCircle2 className="w-4 h-4" />
  Collected
  </button>
  <button
  onClick={onObstacle}
  className="flex items-center justify-center gap-1.5 bg-sand-light hover:bg-gray-200 text-ink/70 text-sm font-medium px-4 py-2.5 rounded-lg transition"
  >
  <AlertTriangle className="w-4 h-4" />
  Issue
  </button>
  </div>
  )}
  </Card>
  );
}

function ObstacleModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (status: CollectionStatus, note: string) => void }) {
  const [status, setStatus] = useState<CollectionStatus>('unavailable');
  const [note, setNote] = useState('');

  const options: { value: CollectionStatus; label: string; desc: string }[] = [
  { value: 'unavailable', label: 'Waste Not Outside', desc: 'Waste was not kept out by the household' },
  { value: 'inaccessible', label: 'Lane Inaccessible', desc: 'Could not reach the house due to blocked lane' },
  { value: 'missed', label: 'Other Issue', desc: 'Any other reason for not collecting' },
  ];

  // The worker_note field captures structured obstacle info
  const obstacles: { value: string; label: string; desc: string }[] = [
    { value: 'Blocked road', label: 'Blocked Road', desc: 'Road is blocked preventing access' },
    { value: 'Vehicle breakdown', label: 'Vehicle Breakdown', desc: 'Collection vehicle has broken down' },
    { value: 'Safety concern', label: 'Safety Concern', desc: 'Unsafe area to collect from' },
    { value: 'Heavy waste needs extra help', label: 'Heavy Waste', desc: 'Waste is too heavy, needs additional help' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-sand">
          <h2 className="font-semibold text-ink">Report Issue</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-light transition">
            <X className="w-5 h-5 text-ink/50" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm font-medium text-ink/70">Collection Issue</p>
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                status === o.value ? 'border-orange-500 bg-orange-50' : 'border-sand hover:border-sand-dark'
              }`}
            >
              <p className="text-sm font-medium text-ink/70">{o.label}</p>
              <p className="text-xs text-ink/40 mt-0.5">{o.desc}</p>
            </button>
          ))}
          <p className="text-sm font-medium text-ink/70 pt-2">Obstacle Type (optional)</p>
          {obstacles.map((o) => (
            <button
              key={o.value}
              onClick={() => setNote(o.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                note === o.value ? 'border-blue-500 bg-blue-50' : 'border-sand hover:border-sand-dark'
              }`}
            >
              <p className="text-sm font-medium text-ink/70">{o.label}</p>
              <p className="text-xs text-ink/40 mt-0.5">{o.desc}</p>
            </button>
          ))}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note (optional)..."
            className="w-full p-3 rounded-lg border border-sand-dark focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
          />
          <button
            onClick={() => onSubmit(status, note)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

function CleanupModal({ onClose, onComplete }: { onClose: () => void; onComplete: (photoUrl?: string) => void }) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleComplete = async () => {
    setUploading(true);
    let photoUrl: string | undefined;
    if (photoFile) {
      const fileName = `cleanup_${Date.now()}.${photoFile.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('cleanup-photos').upload(fileName, photoFile);
      if (!error) {
        const { data } = supabase.storage.from('cleanup-photos').getPublicUrl(fileName);
        photoUrl = data.publicUrl;
      }
    }
    setUploading(false);
    onComplete(photoUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Complete Cleanup</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Upload a completion photo as evidence of the cleanup.</p>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full rounded-lg max-h-48 object-cover" />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-orange-400 transition">
              <Camera className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-500">Tap to add a completion photo</span>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </label>
          )}
          <button
            onClick={handleComplete}
            disabled={uploading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Complete Cleanup'}
          </button>
        </div>
      </div>
    </div>
  );
}
