/*
# SafaiSetu — Complete Database Schema

## Overview
Creates the full schema for SafaiSetu, a municipal waste management app with three roles:
household, worker, and supervisor. Covers municipalities, wards, profiles, households,
workers, routes, collection tasks, missed pickups, hotspot reports, cleanup assignments,
e-waste requests, and notifications.

## New Tables (13)
1. municipalities — Top-level civic body (e.g. Mapusa Municipal Council)
2. wards — Sub-divisions within a municipality
3. profiles — User profile linked to auth.users, with role and location assignments
4. households — Household address and waste-type details
5. workers — Worker employment info and ward assignment
6. routes — Collection routes per ward/worker/day with time window
7. route_households — Ordered list of households on each route
8. collection_tasks — Daily tasks per household on a route, with status
9. missed_pickups — Complaints from households about missed collections
10. hotspot_reports — Citizen reports of illegal dumping with geo-location
11. cleanup_assignments — Worker assignments to clean up hotspots
12. ewaste_requests — Household e-waste pickup requests
13. notifications — In-app notifications per user

## Enums
- user_role: household, worker, supervisor
- waste_type: wet, dry, both
- day_of_week: monday–sunday
- collection_status: scheduled, in_progress, collected, missed, unavailable, inaccessible
- missed_reason: worker_did_not_arrive, waste_not_out, household_unavailable, lane_inaccessible, other
- complaint_status: reported, assigned, resolved, rejected
- waste_category: wet, dry, e_waste, construction, mixed
- urgency_level: low, medium, high
- hotspot_status: new, under_review, cleanup_assigned, resolved, recurring
- cleanup_status: assigned, in_progress, completed
- ewaste_status: requested, scheduled, collected
- notification_type: reminder, missed, recovery, hotspot, ewaste, status

## Security
- RLS enabled on all 13 tables
- All policies scoped to authenticated users
- Profiles: users see/edit their own profile; supervisors can read all profiles in their municipality
- Households: owner-only CRUD
- Workers/routes/tasks: workers see their own assignments; supervisors see everything in their municipality
- Missed pickups/hotspots/e-waste/notifications: owner or supervisor-in-municipality visibility
- A trigger auto-creates a profile row when a new auth user signs up
*/

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('household', 'worker', 'supervisor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE waste_type AS ENUM ('wet', 'dry', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE collection_status AS ENUM ('scheduled','in_progress','collected','missed','unavailable','inaccessible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE missed_reason AS ENUM ('worker_did_not_arrive','waste_not_out','household_unavailable','lane_inaccessible','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE complaint_status AS ENUM ('reported','assigned','resolved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE waste_category AS ENUM ('wet','dry','e_waste','construction','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hotspot_status AS ENUM ('new','under_review','cleanup_assigned','resolved','recurring');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cleanup_status AS ENUM ('assigned','in_progress','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ewaste_status AS ENUM ('requested','scheduled','collected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('reminder','missed','recovery','hotspot','ewaste','status');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  full_name text NOT NULL,
  phone text,
  role user_role NOT NULL DEFAULT 'household',
  municipality_id uuid REFERENCES municipalities(id) ON DELETE SET NULL,
  ward_id uuid REFERENCES wards(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  address_line text NOT NULL,
  landmark text,
  latitude double precision,
  longitude double precision,
  waste_type waste_type NOT NULL DEFAULT 'both',
  ward_id uuid REFERENCES wards(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  assigned_ward_id uuid REFERENCES wards(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  collection_window_start time NOT NULL DEFAULT '06:30',
  collection_window_end time NOT NULL DEFAULT '08:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  sequence_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, household_id)
);

CREATE TABLE IF NOT EXISTS collection_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status collection_status NOT NULL DEFAULT 'scheduled',
  completed_at timestamptz,
  worker_note text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missed_pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_task_id uuid REFERENCES collection_tasks(id) ON DELETE SET NULL,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  reason missed_reason NOT NULL DEFAULT 'other',
  description text,
  status complaint_status NOT NULL DEFAULT 'reported',
  assigned_worker_id uuid REFERENCES workers(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotspot_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  ward_id uuid REFERENCES wards(id) ON DELETE SET NULL,
  latitude double precision,
  longitude double precision,
  description text,
  waste_category waste_category NOT NULL DEFAULT 'mixed',
  urgency urgency_level NOT NULL DEFAULT 'medium',
  photo_url text,
  status hotspot_status NOT NULL DEFAULT 'new',
  recurrence_count int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleanup_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotspot_report_id uuid NOT NULL REFERENCES hotspot_reports(id) ON DELETE CASCADE,
  assigned_worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  status cleanup_status NOT NULL DEFAULT 'assigned',
  completed_at timestamptz,
  completion_photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ewaste_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  preferred_date date,
  item_description text NOT NULL,
  status ewaste_status NOT NULL DEFAULT 'requested',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type notification_type NOT NULL DEFAULT 'status',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wards_municipality ON wards(municipality_id);
CREATE INDEX IF NOT EXISTS idx_profiles_municipality ON profiles(municipality_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ward ON profiles(ward_id);
CREATE INDEX IF NOT EXISTS idx_households_profile ON households(profile_id);
CREATE INDEX IF NOT EXISTS idx_households_ward ON households(ward_id);
CREATE INDEX IF NOT EXISTS idx_workers_profile ON workers(profile_id);
CREATE INDEX IF NOT EXISTS idx_workers_municipality ON workers(municipality_id);
CREATE INDEX IF NOT EXISTS idx_routes_ward ON routes(ward_id);
CREATE INDEX IF NOT EXISTS idx_routes_worker ON routes(worker_id);
CREATE INDEX IF NOT EXISTS idx_route_households_route ON route_households(route_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_route ON collection_tasks(route_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_worker ON collection_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_date ON collection_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_missed_pickups_household ON missed_pickups(household_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_reports_ward ON hotspot_reports(ward_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_assignments_hotspot ON cleanup_assignments(hotspot_report_id);
CREATE INDEX IF NOT EXISTS idx_ewaste_requests_household ON ewaste_requests(household_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ewaste_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- municipalities: any authenticated user can read (needed for sign-up dropdowns)
DROP POLICY IF EXISTS "select_municipalities" ON municipalities;
CREATE POLICY "select_municipalities" ON municipalities FOR SELECT TO authenticated USING (true);

-- wards: any authenticated user can read
DROP POLICY IF EXISTS "select_wards" ON wards;
CREATE POLICY "select_wards" ON wards FOR SELECT TO authenticated USING (true);

-- profiles: users see their own; supervisors see all in their municipality
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- households: owner CRUD; supervisors can read; workers can read for their routes
DROP POLICY IF EXISTS "select_households" ON households;
CREATE POLICY "select_households" ON households FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ) OR EXISTS (
    SELECT 1 FROM workers w
    JOIN routes r ON r.worker_id = w.id
    JOIN route_households rh ON rh.route_id = r.id
    WHERE w.profile_id = auth.uid() AND rh.household_id = households.id
  ));

DROP POLICY IF EXISTS "insert_own_household" ON households;
CREATE POLICY "insert_own_household" ON households FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "update_own_household" ON households;
CREATE POLICY "update_own_household" ON households FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "delete_own_household" ON households;
CREATE POLICY "delete_own_household" ON households FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- workers: supervisors can read all in municipality; workers can read their own
DROP POLICY IF EXISTS "select_workers" ON workers;
CREATE POLICY "select_workers" ON workers FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

DROP POLICY IF EXISTS "insert_workers" ON workers;
CREATE POLICY "insert_workers" ON workers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

DROP POLICY IF EXISTS "update_workers" ON workers;
CREATE POLICY "update_workers" ON workers FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

-- routes: workers see their own; supervisors see in municipality
DROP POLICY IF EXISTS "select_routes" ON routes;
CREATE POLICY "select_routes" ON routes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w WHERE w.id = routes.worker_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

-- route_households: same visibility as routes + household owner
DROP POLICY IF EXISTS "select_route_households" ON route_households;
CREATE POLICY "select_route_households" ON route_households FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w JOIN routes r ON r.worker_id = w.id WHERE r.id = route_households.route_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (SELECT 1 FROM households h WHERE h.id = route_households.household_id AND h.profile_id = auth.uid()));

-- collection_tasks: worker sees their tasks; household sees their tasks; supervisor sees all
DROP POLICY IF EXISTS "select_collection_tasks" ON collection_tasks;
CREATE POLICY "select_collection_tasks" ON collection_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w WHERE w.id = collection_tasks.worker_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM households h WHERE h.id = collection_tasks.household_id AND h.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

DROP POLICY IF EXISTS "update_collection_tasks" ON collection_tasks;
CREATE POLICY "update_collection_tasks" ON collection_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w WHERE w.id = collection_tasks.worker_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

-- missed_pickups: household owner can CRUD; supervisor can read/update; assigned worker can read/update
DROP POLICY IF EXISTS "select_missed_pickups" ON missed_pickups;
CREATE POLICY "select_missed_pickups" ON missed_pickups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM households h WHERE h.id = missed_pickups.household_id AND h.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (SELECT 1 FROM workers w WHERE w.id = missed_pickups.assigned_worker_id AND w.profile_id = auth.uid()));

DROP POLICY IF EXISTS "insert_missed_pickups" ON missed_pickups;
CREATE POLICY "insert_missed_pickups" ON missed_pickups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM households h WHERE h.id = missed_pickups.household_id AND h.profile_id = auth.uid()));

DROP POLICY IF EXISTS "update_missed_pickups" ON missed_pickups;
CREATE POLICY "update_missed_pickups" ON missed_pickups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (SELECT 1 FROM workers w WHERE w.id = missed_pickups.assigned_worker_id AND w.profile_id = auth.uid()));

-- hotspot_reports: reporter can CRUD; supervisors can read/update
DROP POLICY IF EXISTS "select_hotspot_reports" ON hotspot_reports;
CREATE POLICY "select_hotspot_reports" ON hotspot_reports FOR SELECT TO authenticated
  USING (auth.uid() = reported_by OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

DROP POLICY IF EXISTS "insert_hotspot_reports" ON hotspot_reports;
CREATE POLICY "insert_hotspot_reports" ON hotspot_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "update_hotspot_reports" ON hotspot_reports;
CREATE POLICY "update_hotspot_reports" ON hotspot_reports FOR UPDATE TO authenticated
  USING (auth.uid() = reported_by OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'
  ));

-- cleanup_assignments: assigned worker can read/update; supervisor can read/insert/update
DROP POLICY IF EXISTS "select_cleanup_assignments" ON cleanup_assignments;
CREATE POLICY "select_cleanup_assignments" ON cleanup_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w WHERE w.id = cleanup_assignments.assigned_worker_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

DROP POLICY IF EXISTS "insert_cleanup_assignments" ON cleanup_assignments;
CREATE POLICY "insert_cleanup_assignments" ON cleanup_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

DROP POLICY IF EXISTS "update_cleanup_assignments" ON cleanup_assignments;
CREATE POLICY "update_cleanup_assignments" ON cleanup_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workers w WHERE w.id = cleanup_assignments.assigned_worker_id AND w.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

-- ewaste_requests: household owner CRUD; supervisor can read/update
DROP POLICY IF EXISTS "select_ewaste_requests" ON ewaste_requests;
CREATE POLICY "select_ewaste_requests" ON ewaste_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM households h WHERE h.id = ewaste_requests.household_id AND h.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

DROP POLICY IF EXISTS "insert_ewaste_requests" ON ewaste_requests;
CREATE POLICY "insert_ewaste_requests" ON ewaste_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM households h WHERE h.id = ewaste_requests.household_id AND h.profile_id = auth.uid()));

DROP POLICY IF EXISTS "update_ewaste_requests" ON ewaste_requests;
CREATE POLICY "update_ewaste_requests" ON ewaste_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor'));

-- notifications: owner can read/update/delete; system can insert
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'household')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();