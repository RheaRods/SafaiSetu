-- The assigned cleanup worker could never actually see the hotspot_reports row
-- for their own cleanup assignment: select_hotspot_reports only allowed the
-- original reporter or a supervisor to read it. That made the
-- hotspot:hotspot_reports(*) embed in getCleanupAssignments() silently come
-- back null for every worker, so the Cleanup tab showed no description/
-- location, and the worker map had no way to plot hotspot pins.

DROP POLICY IF EXISTS "select_hotspot_reports" ON hotspot_reports;
CREATE POLICY "select_hotspot_reports" ON hotspot_reports FOR SELECT TO authenticated
  USING (auth.uid() = reported_by
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'supervisor')
    OR EXISTS (
      SELECT 1 FROM cleanup_assignments ca
      JOIN workers w ON w.id = ca.assigned_worker_id
      WHERE ca.hotspot_report_id = hotspot_reports.id AND w.profile_id = auth.uid()
    ));
