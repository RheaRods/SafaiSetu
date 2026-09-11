/*
# SafaiSetu — Seed Data for Demo

Inserts sample data for Mapusa Municipal Council, Ward 7, 5 households,
2 workers, 1 supervisor, routes for 7 days, a week of collection tasks,
1 hotspot report, and 1 missed pickup. Also creates auth users for each
demo account so the app can be signed into immediately.

## Demo Accounts (email / password)
- household1@safaisetu.demo / demo1234 — Ramesh Naik (household)
- household2@safaisetu.demo / demo1234 — Anita Desai (household)
- worker1@safaisetu.demo / demo1234 — Ramesh Kumar (worker)
- worker2@safaisetu.demo / demo1234 — Sunita Devi (worker)
- supervisor@safaisetu.demo / demo1234 — Deepak Sharma (supervisor)

## Data
- 1 municipality: Mapusa Municipal Council
- 1 ward: Ward 7
- 5 households with Goan addresses near Mapusa
- 2 workers assigned to Ward 7
- 1 supervisor
- 2 routes (Route A: houses 1-3, Route B: houses 4-5), each for all 7 days
- Collection tasks for the current week (7 days × 5 houses)
- 1 existing hotspot report
- 1 existing missed pickup
*/

DO $$
DECLARE
  m_id uuid;
  w_id uuid;
  h1_id uuid; h2_id uuid; h3_id uuid; h4_id uuid; h5_id uuid;
  wk1_id uuid; wk2_id uuid;
  sup_profile_id uuid;
  h1_profile_id uuid; h2_profile_id uuid;
  wk1_profile_id uuid; wk2_profile_id uuid;
  r_a_id uuid; r_b_id uuid;
  d date;
  dow_idx int;
  dow_name text;
  task_id uuid;
BEGIN
  -- Municipality
  INSERT INTO municipalities (id, name) VALUES ('a0000000-0000-0000-0000-000000000001', 'Mapusa Municipal Council')
  ON CONFLICT (id) DO NOTHING;
  m_id := 'a0000000-0000-0000-0000-000000000001';

  -- Ward
  INSERT INTO wards (id, municipality_id, name) VALUES ('b0000000-0000-0000-0000-000000000001', m_id, 'Ward 7')
  ON CONFLICT (id) DO NOTHING;
  w_id := 'b0000000-0000-0000-0000-000000000001';

  -- Create auth users (idempotent: only if they don't exist)
  -- Supervisor
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'supervisor@safaisetu.demo') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (
      'c0000000-0000-0000-0000-000000000001',
      'supervisor@safaisetu.demo',
      crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Deepak Sharma', 'phone', '9876543210', 'role', 'supervisor')
    );
  END IF;
  sup_profile_id := 'c0000000-0000-0000-0000-000000000001';

  -- Household 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'household1@safaisetu.demo') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (
      'c0000000-0000-0000-0000-000000000002',
      'household1@safaisetu.demo',
      crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Ramesh Naik', 'phone', '9820011221', 'role', 'household')
    );
  END IF;
  h1_profile_id := 'c0000000-0000-0000-0000-000000000002';

  -- Household 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'household2@safaisetu.demo') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (
      'c0000000-0000-0000-0000-000000000003',
      'household2@safaisetu.demo',
      crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Anita Desai', 'phone', '9820011222', 'role', 'household')
    );
  END IF;
  h2_profile_id := 'c0000000-0000-0000-0000-000000000003';

  -- Worker 1
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'worker1@safaisetu.demo') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (
      'c0000000-0000-0000-0000-000000000004',
      'worker1@safaisetu.demo',
      crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Ramesh Kumar', 'phone', '9830044551', 'role', 'worker')
    );
  END IF;
  wk1_profile_id := 'c0000000-0000-0000-0000-000000000004';

  -- Worker 2
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'worker2@safaisetu.demo') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
    VALUES (
      'c0000000-0000-0000-0000-000000000005',
      'worker2@safaisetu.demo',
      crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object('full_name', 'Sunita Devi', 'phone', '9830044552', 'role', 'worker')
    );
  END IF;
  wk2_profile_id := 'c0000000-0000-0000-0000-000000000005';

  -- Profiles (upsert in case trigger already created them)
  INSERT INTO profiles (id, full_name, phone, role, municipality_id, ward_id)
  VALUES (sup_profile_id, 'Deepak Sharma', '9876543210', 'supervisor', m_id, NULL)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role, municipality_id = EXCLUDED.municipality_id;

  INSERT INTO profiles (id, full_name, phone, role, ward_id, municipality_id)
  VALUES (h1_profile_id, 'Ramesh Naik', '9820011221', 'household', w_id, m_id)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role, ward_id = EXCLUDED.ward_id;

  INSERT INTO profiles (id, full_name, phone, role, ward_id, municipality_id)
  VALUES (h2_profile_id, 'Anita Desai', '9820011222', 'household', w_id, m_id)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role, ward_id = EXCLUDED.ward_id;

  INSERT INTO profiles (id, full_name, phone, role, municipality_id)
  VALUES (wk1_profile_id, 'Ramesh Kumar', '9830044551', 'worker', m_id)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role, municipality_id = EXCLUDED.municipality_id;

  INSERT INTO profiles (id, full_name, phone, role, municipality_id)
  VALUES (wk2_profile_id, 'Sunita Devi', '9830044552', 'worker', m_id)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role, municipality_id = EXCLUDED.municipality_id;

  -- Workers
  INSERT INTO workers (id, profile_id, municipality_id, assigned_ward_id, is_active)
  VALUES ('d0000000-0000-0000-0000-000000000001', wk1_profile_id, m_id, w_id, true)
  ON CONFLICT (id) DO NOTHING;
  wk1_id := 'd0000000-0000-0000-0000-000000000001';

  INSERT INTO workers (id, profile_id, municipality_id, assigned_ward_id, is_active)
  VALUES ('d0000000-0000-0000-0000-000000000002', wk2_profile_id, m_id, w_id, true)
  ON CONFLICT (id) DO NOTHING;
  wk2_id := 'd0000000-0000-0000-0000-000000000002';

  -- Households (5)
  INSERT INTO households (id, profile_id, address_line, landmark, latitude, longitude, waste_type, ward_id)
  VALUES ('e0000000-0000-0000-0000-000000000001', h1_profile_id, '12, St. Xavier Road, Mapusa', 'Near St. Xavier Church', 15.5923, 73.7952, 'both', w_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO households (id, profile_id, address_line, landmark, latitude, longitude, waste_type, ward_id)
  VALUES ('e0000000-0000-0000-0000-000000000002', h2_profile_id, '45, Afonso Road, Mapusa', 'Opposite Mapusa Market', 15.5945, 73.7968, 'wet', w_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO households (id, profile_id, address_line, landmark, latitude, longitude, waste_type, ward_id)
  VALUES ('e0000000-0000-0000-0000-000000000003', h1_profile_id, '78, Dempo Street, Mapusa', 'Near Hanuman Temple', 15.5901, 73.7940, 'dry', w_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO households (id, profile_id, address_line, landmark, latitude, longitude, waste_type, ward_id)
  VALUES ('e0000000-0000-0000-0000-000000000004', h2_profile_id, '23, Boca da Vaca Lane, Mapusa', 'Near Old Bridge', 15.5889, 73.7975, 'both', w_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO households (id, profile_id, address_line, landmark, latitude, longitude, waste_type, ward_id)
  VALUES ('e0000000-0000-0000-0000-000000000005', h1_profile_id, '56, Boa Vida Road, Mapusa', 'Near Industrial Estate', 15.5960, 73.7935, 'both', w_id)
  ON CONFLICT (id) DO NOTHING;

  h1_id := 'e0000000-0000-0000-0000-000000000001';
  h2_id := 'e0000000-0000-0000-0000-000000000002';
  h3_id := 'e0000000-0000-0000-0000-000000000003';
  h4_id := 'e0000000-0000-0000-0000-000000000004';
  h5_id := 'e0000000-0000-0000-0000-000000000005';

  -- Routes: Route A (houses 1-3, worker 1), Route B (houses 4-5, worker 2)
  -- Create routes for all 7 days
  FOREACH dow_name IN ARRAY ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] LOOP
    -- Route A
    INSERT INTO routes (ward_id, worker_id, day_of_week, collection_window_start, collection_window_end, is_active)
    VALUES (w_id, wk1_id, dow_name::day_of_week, '06:30', '08:00', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO r_a_id;

    -- If route already existed, fetch it
    IF r_a_id IS NULL THEN
      SELECT id INTO r_a_id FROM routes WHERE ward_id = w_id AND worker_id = wk1_id AND day_of_week = dow_name::day_of_week LIMIT 1;
    END IF;

    -- Route B
    INSERT INTO routes (ward_id, worker_id, day_of_week, collection_window_start, collection_window_end, is_active)
    VALUES (w_id, wk2_id, dow_name::day_of_week, '08:00', '09:30', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO r_b_id;

    IF r_b_id IS NULL THEN
      SELECT id INTO r_b_id FROM routes WHERE ward_id = w_id AND worker_id = wk2_id AND day_of_week = dow_name::day_of_week LIMIT 1;
    END IF;

    -- Route households
    INSERT INTO route_households (route_id, household_id, sequence_order)
    VALUES (r_a_id, h1_id, 1), (r_a_id, h2_id, 2), (r_a_id, h3_id, 3)
    ON CONFLICT (route_id, household_id) DO NOTHING;

    INSERT INTO route_households (route_id, household_id, sequence_order)
    VALUES (r_b_id, h4_id, 1), (r_b_id, h5_id, 2)
    ON CONFLICT (route_id, household_id) DO NOTHING;

    r_a_id := NULL;
    r_b_id := NULL;
  END LOOP;

  -- Collection tasks for current week (Monday to Sunday)
  d := date_trunc('week', now())::date; -- Monday of current week
  FOR i IN 0..6 LOOP
    dow_idx := EXTRACT(DOW FROM d + i); -- 0=Sunday, 1=Monday...
    dow_name := CASE dow_idx
      WHEN 1 THEN 'monday' WHEN 2 THEN 'tuesday' WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday' WHEN 5 THEN 'friday' WHEN 6 THEN 'saturday'
      WHEN 0 THEN 'sunday'
    END;

    -- Route A tasks (houses 1-3, worker 1)
    SELECT id INTO r_a_id FROM routes WHERE ward_id = w_id AND worker_id = wk1_id AND day_of_week = dow_name::day_of_week LIMIT 1;
    IF r_a_id IS NOT NULL THEN
      -- House 1
      INSERT INTO collection_tasks (route_id, household_id, worker_id, scheduled_date, status)
      VALUES (r_a_id, h1_id, wk1_id, d + i, 'scheduled')
      ON CONFLICT DO NOTHING;
      -- House 2
      INSERT INTO collection_tasks (route_id, household_id, worker_id, scheduled_date, status)
      VALUES (r_a_id, h2_id, wk1_id, d + i, 'scheduled')
      ON CONFLICT DO NOTHING;
      -- House 3
      INSERT INTO collection_tasks (route_id, household_id, worker_id, scheduled_date, status)
      VALUES (r_a_id, h3_id, wk1_id, d + i, 'scheduled')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Route B tasks (houses 4-5, worker 2)
    SELECT id INTO r_b_id FROM routes WHERE ward_id = w_id AND worker_id = wk2_id AND day_of_week = dow_name::day_of_week LIMIT 1;
    IF r_b_id IS NOT NULL THEN
      INSERT INTO collection_tasks (route_id, household_id, worker_id, scheduled_date, status)
      VALUES (r_b_id, h4_id, wk2_id, d + i, 'scheduled')
      ON CONFLICT DO NOTHING;
      INSERT INTO collection_tasks (route_id, household_id, worker_id, scheduled_date, status)
      VALUES (r_b_id, h5_id, wk2_id, d + i, 'scheduled')
      ON CONFLICT DO NOTHING;
    END IF;

    r_a_id := NULL;
    r_b_id := NULL;
  END LOOP;

  -- Mark yesterday's house 1 as collected (for history demo)
  UPDATE collection_tasks
  SET status = 'collected', completed_at = now() - interval '1 day', latitude = 15.5923, longitude = 73.7952
  WHERE household_id = h1_id AND scheduled_date = (now() - interval '1 day')::date;

  -- Mark 2 days ago house 2 as collected
  UPDATE collection_tasks
  SET status = 'collected', completed_at = now() - interval '2 days', latitude = 15.5945, longitude = 73.7968
  WHERE household_id = h2_id AND scheduled_date = (now() - interval '2 days')::date;

  -- Mark 3 days ago house 3 as missed (for missed pickup demo)
  UPDATE collection_tasks
  SET status = 'missed'
  WHERE household_id = h3_id AND scheduled_date = (now() - interval '3 days')::date;

  -- Create a missed pickup record for house 3
  SELECT id INTO task_id FROM collection_tasks WHERE household_id = h3_id AND scheduled_date = (now() - interval '3 days')::date LIMIT 1;
  IF task_id IS NOT NULL THEN
    INSERT INTO missed_pickups (collection_task_id, household_id, reason, description, status)
    VALUES (task_id, h3_id, 'worker_did_not_arrive', 'The waste collection worker did not arrive on the scheduled day. Waste was kept outside from 6:30 AM.', 'reported')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create a hotspot report
  INSERT INTO hotspot_reports (reported_by, ward_id, latitude, longitude, description, waste_category, urgency, status, recurrence_count)
  VALUES (h1_profile_id, w_id, 15.5910, 73.7955, 'Large pile of mixed waste dumped near the storm drain next to St. Xavier Church. Spreading smell and attracting stray dogs.', 'mixed', 'high', 'new', 1)
  ON CONFLICT DO NOTHING;

  -- Create a notification for the supervisor
  INSERT INTO notifications (profile_id, title, message, type, is_read)
  VALUES (sup_profile_id, 'New missed pickup reported', 'Household at 78, Dempo Street reported a missed pickup 3 days ago.', 'missed', false)
  ON CONFLICT DO NOTHING;

  INSERT INTO notifications (profile_id, title, message, type, is_read)
  VALUES (sup_profile_id, 'New hotspot reported', 'High urgency hotspot reported near St. Xavier Church, Mapusa.', 'hotspot', false)
  ON CONFLICT DO NOTHING;

END $$;