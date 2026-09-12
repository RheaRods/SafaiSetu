import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { Card, PageHeader, LoadingSpinner, EmptyState, StatusBadge } from '@/components/ui';
import {
  Calendar, Clock, Trash2, MapPin, AlertTriangle, Recycle, CheckCircle2,
  History, X, Camera, Bell
} from 'lucide-react';
import { useCollectionReminder } from '@/hooks/useCollectionReminder';
import {
  getHousehold, getTodayTasks, getWeeklySchedule, getCollectionHistory,
  reportMissedPickup, requestEwastePickup, getEwasteRequests, getMissedPickups
} from '@/services/householdService';
import { createHotspotReport } from '@/services/hotspotService';
import { supabase } from '@/lib/supabase';
import MapView from '@/components/MapView';
import type { Household, CollectionTask, EwasteRequest, MissedPickup, MissedReason, WasteCategory, UrgencyLevel } from '@/types';

type Tab = 'home' | 'schedule' | 'history';
type Modal = null | 'missed' | 'hotspot' | 'ewaste';

export default function HouseholdDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [modal, setModal] = useState<Modal>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [todayTask, setTodayTask] = useState<any>(null);
  const [weekSchedule, setWeekSchedule] = useState<any[]>([]);
  const [history, setHistory] = useState<CollectionTask[]>([]);
  const [ewasteRequests, setEwasteRequests] = useState<EwasteRequest[]>([]);
  const [missedPickups, setMissedPickups] = useState<MissedPickup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
  if (!profile) return;
  setLoading(true);
  try {
  const hh = await getHousehold(profile.id);
  setHousehold(hh);
  if (hh) {
  const [today, week, hist, ewaste, missed] = await Promise.all([
  getTodayTasks(hh.id),
  getWeeklySchedule(hh.id),
  getCollectionHistory(hh.id),
  getEwasteRequests(hh.id),
  getMissedPickups(hh.id),
  ]);
  setTodayTask(today);
  setWeekSchedule(week || []);
  setHistory(hist || []);
  setEwasteRequests(ewaste || []);
  setMissedPickups(missed || []);
  }
  } catch (err) {
  console.error(err);
  } finally {
  setLoading(false);
  }
  }, [profile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: update when collection tasks or missed pickups change
  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel('household-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collection_tasks' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missed_pickups' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ewaste_requests' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchAll())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [profile, fetchAll]);

  const reminder = useCollectionReminder(
    profile?.id,
    todayTask?.route?.collection_window_start,
    todayTask?.scheduled_date,
  );

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (!household) return (
  <AppShell>
  <EmptyState icon={Trash2} title="No household registered" message="Please contact your supervisor to get your household added to the system." />
  </AppShell>
  );

  const wasteTypeLabel: Record<string, string> = { wet: 'Wet Waste', dry: 'Dry Waste', both: 'Wet & Dry Waste' };

  return (
  <AppShell>
  <PageHeader
  title={`Hello, ${profile?.full_name?.split(' ')[0]}`}
  subtitle={household.address_line}
  />

      {/* Collection reminder banner */}
      {reminder.active && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-200 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">Collection Reminder</p>
              <p className="text-sm text-amber-700">{reminder.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setModal('missed')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl glass border border-white/50 hover:border-brick/30 transition"
        >
          <div className="w-10 h-10 rounded-lg bg-brick/5 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-brick" />
          </div>
          <span className="text-xs font-medium text-ink/70">Report Missed</span>
        </button>

        <button
          onClick={() => setModal('hotspot')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl glass border border-white/50 hover:border-orange-200 transition"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-orange-500" />
          </div>
          <span className="text-xs font-medium text-ink/70">Report Hotspot</span>
        </button>

        <button
          onClick={() => setModal('ewaste')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl glass border border-white/50 hover:border-forest/30 transition"
        >
          <div className="w-10 h-10 rounded-lg bg-moss/10 flex items-center justify-center">
            <Recycle className="w-5 h-5 text-forest" />
          </div>
          <span className="text-xs font-medium text-ink/70">E-Waste</span>
        </button>
      </div>

  {/* Tabs */}
  <div className="flex gap-1 mb-6 bg-sand-light p-1 rounded-lg w-fit">
  {([['home', 'Today'], ['schedule', 'Schedule'], ['history', 'History']] as [Tab, string][]).map(([key, label]) => (
  <button
  key={key}
  onClick={() => setTab(key)}
  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
  tab === key ? 'bg-white text-ink ' : 'text-ink/50 hover:text-ink/70'
  }`}
  >
  {label}
  </button>
  ))}
  </div>

  {tab === 'home' && <HomeTab todayTask={todayTask} household={household} wasteTypeLabel={wasteTypeLabel} missedPickups={missedPickups} ewasteRequests={ewasteRequests} />}
  {tab === 'schedule' && <ScheduleTab weekSchedule={weekSchedule} />}
  {tab === 'history' && <HistoryTab history={history} />}

  {modal === 'missed' && <MissedPickupModal householdId={household.id} onClose={() => setModal(null)} onSubmitted={fetchAll} />}
  {modal === 'hotspot' && <HotspotModal profileId={profile!.id} wardId={household.ward_id} defaultLat={household.latitude} defaultLng={household.longitude} onClose={() => setModal(null)} onSubmitted={fetchAll} />}
  {modal === 'ewaste' && <EwasteModal householdId={household.id} onClose={() => setModal(null)} onSubmitted={fetchAll} />}
  </AppShell>
  );
}

function HomeTab({ todayTask, household, wasteTypeLabel, missedPickups, ewasteRequests }: any) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  collected: { color: 'text-forest-dark', bg: 'bg-forest/5 border-forest/30', icon: CheckCircle2, label: 'Collected!' },
  scheduled: { color: 'text-clay-dark', bg: 'bg-clay/5 border-amber-200', icon: Clock, label: 'Scheduled' },
  missed: { color: 'text-brick', bg: 'bg-brick/5 border-brick/30', icon: AlertTriangle, label: 'Missed' },
  in_progress: { color: 'text-clay-dark', bg: 'bg-clay/5 border-clay/30', icon: Clock, label: 'In Progress' },
  unavailable: { color: 'text-clay-dark', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle, label: 'Unavailable' },
  inaccessible: { color: 'text-clay-dark', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle, label: 'Inaccessible' },
  };

  const status = todayTask?.status || 'scheduled';
  const cfg = statusConfig[status] || statusConfig.scheduled;
  const StatusIcon = cfg.icon;

  return (
  <div className="space-y-4">
  {/* Today's collection status */}
  <Card className={`p-6 border-2 ${cfg.bg}`}>
  <div className="flex items-start justify-between">
  <div>
  <p className="text-sm text-ink/50">{today}</p>
  <div className="flex items-center gap-2 mt-2">
  <StatusIcon className={`w-6 h-6 ${cfg.color}`} />
  <h2 className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</h2>
  </div>
  </div>
  <div className="text-right">
  <div className="flex items-center gap-1.5 text-ink/60">
  <Clock className="w-4 h-4" />
  <span className="text-sm font-medium">
  {todayTask?.route ? `${todayTask.route.collection_window_start} - ${todayTask.route.collection_window_end}` : '06:30 - 08:00'}
  </span>
  </div>
  </div>
  </div>
  </Card>

  <div className="grid sm:grid-cols-2 gap-4">
  {/* Waste type */}
  <Card className="p-5">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg bg-moss/10 flex items-center justify-center">
  <Trash2 className="w-5 h-5 text-forest" />
  </div>
  <div>
  <p className="text-xs text-ink/40">Waste Type</p>
  <p className="font-semibold text-ink">{wasteTypeLabel[household.waste_type] || 'Both'}</p>
  </div>
  </div>
  </Card>

  {/* Landmark */}
  <Card className="p-5">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg bg-clay/5 flex items-center justify-center">
  <MapPin className="w-5 h-5 text-clay" />
  </div>
  <div>
  <p className="text-xs text-ink/40">Landmark</p>
  <p className="font-semibold text-ink">{household.landmark || 'N/A'}</p>
  </div>
  </div>
  </Card>
  </div>

  {/* Active complaints */}
  {missedPickups.length > 0 && (
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
  <AlertTriangle className="w-4 h-4 text-brick" />
  Active Complaints
  </h3>
  <div className="space-y-2">
  {missedPickups.slice(0, 3).map((mp: MissedPickup) => (
  <div key={mp.id} className="flex items-center justify-between p-3 rounded-lg bg-paper">
  <div>
  <p className="text-sm font-medium text-ink/70">{mp.reason.replace(/_/g, ' ')}</p>
  {mp.description && <p className="text-xs text-ink/40 mt-0.5">{mp.description}</p>}
  </div>
  <StatusBadge status={mp.status} />
  </div>
  ))}
  </div>
  </Card>
  )}

  {/* E-waste requests */}
  {ewasteRequests.length > 0 && (
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
  <Recycle className="w-4 h-4 text-forest" />
  E-Waste Requests
  </h3>
  <div className="space-y-2">
  {ewasteRequests.slice(0, 3).map((er: EwasteRequest) => (
  <div key={er.id} className="flex items-center justify-between p-3 rounded-lg bg-paper">
  <div>
  <p className="text-sm font-medium text-ink/70">{er.item_description}</p>
  {er.preferred_date && <p className="text-xs text-ink/40 mt-0.5">Preferred: {er.preferred_date}</p>}
  </div>
  <StatusBadge status={er.status} />
  </div>
  ))}
  </div>
  </Card>
  )}
  </div>
  );
}

function ScheduleTab({ weekSchedule }: { weekSchedule: any[] }) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = weekSchedule.reduce((acc: Record<string, any>, task) => {
  const dayName = dayNames[new Date(task.scheduled_date).getDay() === 0 ? 6 : new Date(task.scheduled_date).getDay() - 1];
  if (!acc[dayName]) acc[dayName] = [];
  acc[dayName].push(task);
  return acc;
  }, {});

  return (
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
  <Calendar className="w-5 h-5 text-forest" />
  This Week's Collection Schedule
  </h3>
  {weekSchedule.length === 0 ? (
  <EmptyState icon={Calendar} title="No schedule" message="No collections scheduled for this week." />
  ) : (
  <div className="space-y-3">
  {dayNames.map((day) => (
  <div key={day} className="flex items-center gap-4 p-3 rounded-lg hover:bg-paper transition">
  <div className="w-12 h-12 rounded-lg bg-moss/10 flex items-center justify-center flex-shrink-0">
  <span className="text-sm font-bold text-forest-dark">{day}</span>
  </div>
  <div className="flex-1">
  {days[day] ? (
  days[day].map((task: any) => (
  <div key={task.id} className="flex items-center justify-between">
  <span className="text-sm text-ink/60">
  {task.route?.collection_window_start} - {task.route?.collection_window_end}
  </span>
  <StatusBadge status={task.status} />
  </div>
  ))
  ) : (
  <span className="text-sm text-ink/40">No collection</span>
  )}
  </div>
  </div>
  ))}
  </div>
  )}
  </Card>
  );
}

function HistoryTab({ history }: { history: CollectionTask[] }) {
  return (
  <Card className="p-5">
  <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
  <History className="w-5 h-5 text-forest" />
  Collection History
  </h3>
  {history.length === 0 ? (
  <EmptyState icon={History} title="No history" message="Your collection history will appear here once collections happen." />
  ) : (
  <div className="space-y-2">
  {history.map((task) => (
  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-paper hover:bg-sand-light transition">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-sand">
  <Calendar className="w-4 h-4 text-ink/40" />
  </div>
  <div>
  <p className="text-sm font-medium text-ink/70">
  {new Date(task.scheduled_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
  </p>
  {task.completed_at && (
  <p className="text-xs text-ink/40">
  Completed at {new Date(task.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
  </p>
  )}
  </div>
  </div>
  <StatusBadge status={task.status} />
  </div>
  ))}
  </div>
  )}
  </Card>
  );
}

function MissedPickupModal({ householdId, onClose, onSubmitted }: { householdId: string; onClose: () => void; onSubmitted: () => void }) {
  const [reason, setReason] = useState<MissedReason>('worker_did_not_arrive');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reasons: { value: MissedReason; label: string }[] = [
  { value: 'worker_did_not_arrive', label: 'Worker did not arrive' },
  { value: 'waste_not_out', label: 'Waste was not taken despite being out' },
  { value: 'household_unavailable', label: 'Household was unavailable' },
  { value: 'lane_inaccessible', label: 'Lane was inaccessible' },
  { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
  setSubmitting(true);
  try {
  await reportMissedPickup(householdId, null, reason, description);
  onSubmitted();
  onClose();
  } catch (err) {
  console.error(err);
  } finally {
  setSubmitting(false);
  }
  };

  return (
  <Modal title="Report Missed Pickup" onClose={onClose}>
  <div className="space-y-4">
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-2">Reason</label>
  <div className="space-y-2">
  {reasons.map((r) => (
  <button
  key={r.value}
  onClick={() => setReason(r.value)}
  className={`w-full text-left p-3 rounded-lg border-2 transition ${
  reason === r.value ? 'border-forest bg-moss/10' : 'border-sand hover:border-sand-dark'
  }`}
  >
  <span className="text-sm text-ink/70">{r.label}</span>
  </button>
  ))}
  </div>
  </div>
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-1.5">Description (optional)</label>
  <textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={3}
  className="w-full p-3 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition text-sm"
  placeholder="Add any details that might help..."
  />
  </div>
  <button
  onClick={handleSubmit}
  disabled={submitting}
  className="w-full bg-brick hover:bg-brick text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
  >
  {submitting ? 'Submitting...' : 'Submit Report'}
  </button>
  </div>
  </Modal>
  );
}

function HotspotModal({ profileId, wardId, defaultLat, defaultLng, onClose, onSubmitted }: any) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WasteCategory>('mixed');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const categories: { value: WasteCategory; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'e_waste', label: 'E-Waste' },
  { value: 'construction', label: 'Construction' },
  ];

  const urgencyLevels: { value: UrgencyLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-forest' },
  { value: 'medium', label: 'Medium', color: 'text-clay-dark' },
  { value: 'high', label: 'High', color: 'text-brick' },
  ];

  const handleUseLocation = () => {
  if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
  (pos) => {
  setLat(pos.coords.latitude);
  setLng(pos.coords.longitude);
  setUseMyLocation(true);
  },
  () => alert('Could not get your location. Please tap the map instead.')
  );
  }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | undefined> => {
    if (!photoFile) return undefined;
    const fileName = `hotspot_${Date.now()}.${photoFile.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('hotspot-photos').upload(fileName, photoFile);
    if (error) {
      console.error('Upload failed:', error);
      return undefined;
    }
    const { data } = supabase.storage.from('hotspot-photos').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (lat === null || lng === null) {
      alert('Please select a location on the map');
      return;
    }

    setSubmitting(true);
    try {
      const photoUrl = await uploadPhoto();
      await createHotspotReport(
        profileId,
        wardId,
        lat,
        lng,
        description,
        category,
        urgency,
        photoUrl
      );
      onSubmitted();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
  <Modal title="Report a Hotspot" onClose={onClose} wide>
  <div className="space-y-4">
  <div>
  <div className="flex items-center justify-between mb-2">
  <label className="block text-sm font-medium text-ink/70">Location</label>
  <button onClick={handleUseLocation} className="text-xs text-forest font-medium hover:underline flex items-center gap-1">
  <MapPin className="w-3 h-3" /> Use my location
  </button>
  </div>
  <MapView
  center={[defaultLat || 15.5912, defaultLng || 73.7947]}
  interactive
  onLocationSelect={(la, ln) => { setLat(la); setLng(ln); }}
  height={250}
  zoom={16}
  />
  {lat !== null && (
  <p className="text-xs text-ink/40 mt-1.5">
  Selected: {lat.toFixed(4)}, {lng?.toFixed(4)}
  </p>
  )}
  </div>

  <div>
  <label className="block text-sm font-medium text-ink/70 mb-2">Waste Category</label>
  <div className="grid grid-cols-5 gap-2">
  {categories.map((c) => (
  <button
  key={c.value}
  onClick={() => setCategory(c.value)}
  className={`p-2 rounded-lg border-2 text-xs font-medium transition ${
  category === c.value ? 'border-forest bg-moss/10 text-forest-dark' : 'border-sand text-ink/50'
  }`}
  >
  {c.label}
  </button>
  ))}
  </div>
  </div>

  <div>
  <label className="block text-sm font-medium text-ink/70 mb-2">Urgency</label>
  <div className="grid grid-cols-3 gap-2">
  {urgencyLevels.map((u) => (
  <button
  key={u.value}
  onClick={() => setUrgency(u.value)}
  className={`p-2 rounded-lg border-2 text-sm font-medium transition ${
  urgency === u.value ? 'border-forest bg-moss/10' : 'border-sand text-ink/50'
  } ${urgency === u.value ? u.color : ''}`}
  >
  {u.label}
  </button>
  ))}
  </div>
  </div>

  <div>
  <label className="block text-sm font-medium text-ink/70 mb-1.5">Description</label>
  <textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={3}
  className="w-full p-3 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition text-sm"
  placeholder="Describe what you see..."
  />
  </div>

        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1.5">Photo (optional)</label>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full rounded-lg max-h-48 object-cover"
              />
              <button
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-sand-dark cursor-pointer hover:border-forest transition">
              <Camera className="w-6 h-6 text-ink/40" />
              <span className="text-sm text-ink/50">Tap to add a photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || lat === null}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </Modal>
  );
}

function EwasteModal({ householdId, onClose, onSubmitted }: { householdId: string; onClose: () => void; onSubmitted: () => void }) {
  const [date, setDate] = useState('');
  const [items, setItems] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
  if (!items.trim()) {
  alert('Please describe the items you want collected');
  return;
  }
  setSubmitting(true);
  try {
  await requestEwastePickup(householdId, date || new Date().toISOString().split('T')[0], items);
  onSubmitted();
  onClose();
  } catch (err) {
  console.error(err);
  } finally {
  setSubmitting(false);
  }
  };

  return (
  <Modal title="Request E-Waste Pickup" onClose={onClose}>
  <div className="space-y-4">
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-1.5">Preferred Date</label>
  <input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  min={new Date().toISOString().split('T')[0]}
  className="w-full p-2.5 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition"
  />
  </div>
  <div>
  <label className="block text-sm font-medium text-ink/70 mb-1.5">Item Description</label>
  <textarea
  value={items}
  onChange={(e) => setItems(e.target.value)}
  rows={4}
  className="w-full p-3 rounded-lg border border-sand-dark focus:border-forest focus:ring-2 focus:ring-moss/20 outline-none transition text-sm"
  placeholder="e.g., 2 old laptops, 1 CRT monitor, 3 mobile phones..."
  />
  </div>
  <button
  onClick={handleSubmit}
  disabled={submitting}
  className="w-full bg-forest hover:bg-forest-dark text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
  >
  {submitting ? 'Submitting...' : 'Submit Request'}
  </button>
  </div>
  </Modal>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
  <div
  className={`bg-white rounded-2xl shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-md'} w-full max-h-[90vh] overflow-y-auto`}
  onClick={(e) => e.stopPropagation()}
  >
  <div className="flex items-center justify-between p-5 border-b border-sand sticky top-0 bg-white rounded-t-2xl">
  <h2 className="font-semibold text-ink">{title}</h2>
  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-sand-light transition">
  <X className="w-5 h-5 text-ink/50" />
  </button>
  </div>
  <div className="p-5">{children}</div>
  </div>
  </div>
  );
}
