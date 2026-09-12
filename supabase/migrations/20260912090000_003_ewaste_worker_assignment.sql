-- Adds worker assignment tracking to ewaste_requests so workers can see and
-- complete the e-waste pickups a supervisor schedules them for.
-- Previously scheduleEwaste() notified a worker but never persisted which
-- worker was assigned, so there was no way to query "my e-waste pickups".

ALTER TABLE ewaste_requests
  ADD COLUMN IF NOT EXISTS assigned_worker_id uuid REFERENCES workers(id),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ewaste_requests_assigned_worker ON ewaste_requests(assigned_worker_id);

-- select_ewaste_requests: household owner, supervisor, OR the assigned worker
DROP POLICY IF EXISTS "select_ewaste_requests" ON ewaste_requests;
CREATE POLICY "select_ewaste_requests" ON ewaste_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM households h WHERE h.id = ewaste_requests.household_id AND h.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (SELECT 1 FROM workers w WHERE w.id = ewaste_requests.assigned_worker_id AND w.profile_id = auth.uid()));

-- update_ewaste_requests: supervisor (schedule/assign), OR the assigned worker (mark collected)
DROP POLICY IF EXISTS "update_ewaste_requests" ON ewaste_requests;
CREATE POLICY "update_ewaste_requests" ON ewaste_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (SELECT 1 FROM workers w WHERE w.id = ewaste_requests.assigned_worker_id AND w.profile_id = auth.uid()));
