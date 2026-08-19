-- Migration: Allow unauthenticated Smart TV broadcasts (anon role) to read active OPD queue and patient names
GRANT SELECT ON public.walkin_queue TO anon;
GRANT SELECT ON public.patients TO anon;
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT ON public.departments TO anon;

-- Policy allowing unauthenticated TV display to read active queue items
DROP POLICY IF EXISTS walkin_queue_anon_select ON public.walkin_queue;
CREATE POLICY walkin_queue_anon_select ON public.walkin_queue
  FOR SELECT
  TO anon
  USING (status IN ('WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION'));

-- Policy allowing unauthenticated TV display to read patient names for queued patients
DROP POLICY IF EXISTS patients_anon_select ON public.patients;
CREATE POLICY patients_anon_select ON public.patients
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.walkin_queue
      WHERE walkin_queue.patient_id = patients.id
      AND walkin_queue.status IN ('WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION')
    )
  );

-- Policy allowing unauthenticated TV display to read room names for active queue
DROP POLICY IF EXISTS rooms_anon_select ON public.rooms;
CREATE POLICY rooms_anon_select ON public.rooms
  FOR SELECT
  TO anon
  USING (true);

-- Policy allowing unauthenticated TV display to read department names for active queue
DROP POLICY IF EXISTS departments_anon_select ON public.departments;
CREATE POLICY departments_anon_select ON public.departments
  FOR SELECT
  TO anon
  USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
