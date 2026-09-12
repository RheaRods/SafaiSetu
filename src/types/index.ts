export type UserRole = 'household' | 'worker' | 'supervisor';
export type WasteType = 'wet' | 'dry' | 'both';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type CollectionStatus = 'scheduled' | 'in_progress' | 'collected' | 'missed' | 'unavailable' | 'inaccessible';
export type MissedReason = 'worker_did_not_arrive' | 'waste_not_out' | 'household_unavailable' | 'lane_inaccessible' | 'other';
export type ComplaintStatus = 'reported' | 'assigned' | 'resolved' | 'rejected';
export type WasteCategory = 'wet' | 'dry' | 'e_waste' | 'construction' | 'mixed';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type HotspotStatus = 'new' | 'under_review' | 'cleanup_assigned' | 'resolved' | 'recurring';
export type CleanupStatus = 'assigned' | 'in_progress' | 'completed';
export type EwasteStatus = 'requested' | 'scheduled' | 'collected';
export type NotificationType = 'reminder' | 'missed' | 'recovery' | 'hotspot' | 'ewaste' | 'status';

export interface Municipality {
  id: string;
  name: string;
  created_at: string;
}

export interface Ward {
  id: string;
  municipality_id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  municipality_id: string | null;
  ward_id: string | null;
  created_at: string;
}

export interface Household {
  id: string;
  profile_id: string;
  address_line: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  waste_type: WasteType;
  ward_id: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  profile_id: string;
  municipality_id: string;
  assigned_ward_id: string | null;
  is_active: boolean;
  created_at: string;
  assigned_ward?: { name: string } | null;
  municipality?: { name: string } | null;
}

export interface Route {
  id: string;
  ward_id: string;
  worker_id: string;
  day_of_week: DayOfWeek;
  collection_window_start: string;
  collection_window_end: string;
  is_active: boolean;
  created_at: string;
}

export interface RouteHousehold {
  id: string;
  route_id: string;
  household_id: string;
  sequence_order: number;
  created_at: string;
}

export interface CollectionTask {
  id: string;
  route_id: string;
  household_id: string;
  worker_id: string;
  scheduled_date: string;
  status: CollectionStatus;
  completed_at: string | null;
  worker_note: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface MissedPickup {
  id: string;
  collection_task_id: string | null;
  household_id: string;
  reason: MissedReason;
  description: string | null;
  status: ComplaintStatus;
  assigned_worker_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface HotspotReport {
  id: string;
  reported_by: string;
  ward_id: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  waste_category: WasteCategory;
  urgency: UrgencyLevel;
  photo_url: string | null;
  status: HotspotStatus;
  recurrence_count: number;
  created_at: string;
}

export interface CleanupAssignment {
  id: string;
  hotspot_report_id: string;
  assigned_worker_id: string;
  status: CleanupStatus;
  completed_at: string | null;
  completion_photo_url: string | null;
  created_at: string;
}

export interface EwasteRequest {
  id: string;
  household_id: string;
  preferred_date: string | null;
  item_description: string;
  status: EwasteStatus;
  assigned_worker_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  profile_id: string;
  title: string;
  message: string | null;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface CollectionTaskWithDetails extends CollectionTask {
  household?: Household;
  worker?: Worker;
  route?: Route;
}

export interface MissedPickupWithDetails extends MissedPickup {
  household?: Household;
  assigned_worker?: Worker;
}
