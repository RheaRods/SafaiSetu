import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { Card, PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/ui';
import MapView from '@/components/MapView';
import {
  Route as RouteIcon, CheckCircle2, XCircle, MapPin, Clock, Users,
  Play, AlertTriangle, RefreshCw, Trash2, Camera, ChevronRight, X, Navigation
} from 'lucide-react';
import { getWorkerByProfile, getTodayTasks, updateTaskStatus, getRecoveryAssignments, completeRecovery, getCleanupAssignments, completeCleanup } from '@/services/workerService';
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
  const [showMap, setShowMap] = useState(false);
  const [obstacleModal, setObstacleModal] = useState<string | null>(null);
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCollect = async (taskId: string) => {
    let lat: number | undefined, lng: number | undefined;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; },
        () => {},
        { timeout: 3000 }
      );
    }
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

  const handleCompleteCleanup = async (id: string) => {
    try {
      await completeCleanup(id);
      showToast('Cleanup completed');
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
        subtitle={worker.assigned_ward_id ? 'Ward 7 • Mapusa' : 'Worker Dashboard'}
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completed}</p>
              <p className="text-xs text-gray-400">Done</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pending}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{missed}</p>
              <p className="text-xs text-gray-400">Issues</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Today's Progress</span>
            <span className="text-sm font-bold text-teal-600">{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'recovery' && recoveries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{recoveries.length}</span>
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
                    <p className="font-semibold text-gray-900">{r.household?.address_line}</p>
                    {r.household?.landmark && <p className="text-sm text-gray-400">{r.household.landmark}</p>}
                    <p className="text-xs text-gray-500 mt-1">Reason: {r.reason.replace(/_/g, ' ')}</p>
                    {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <button
                  onClick={() => handleCompleteRecovery(r.id)}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
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
                    <p className="font-semibold text-gray-900">Hotspot Cleanup</p>
                    {c.hotspot?.description && <p className="text-sm text-gray-400 mt-1">{c.hotspot.description}</p>}
                    {c.hotspot?.latitude && c.hotspot?.longitude && (
                      <p className="text-xs text-gray-400 mt-1">
                        Location: {c.hotspot.latitude.toFixed(4)}, {c.hotspot.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <button
                  onClick={() => handleCompleteCleanup(c.id)}
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
          <h3 className="font-semibold text-gray-900 mb-3">Route Map</h3>
          {mapMarkers.length === 0 ? (
            <EmptyState icon={MapPin} title="No locations" message="No household locations available to display." />
          ) : (
            <>
              <div className="flex gap-3 mb-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span>Collected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span>Pending</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span>Missed</span>
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-xl">
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
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-gray-600">{index}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{task.household?.address_line}</p>
          {task.household?.landmark && <p className="text-sm text-gray-400">{task.household.landmark}</p>}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={task.status} />
            {task.completed_at && (
              <span className="text-xs text-gray-400">
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
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Collected
          </button>
          <button
            onClick={onObstacle}
            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Report Issue</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                status === o.value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-700">{o.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
            </button>
          ))}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note (optional)..."
            className="w-full p-3 rounded-lg border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
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
