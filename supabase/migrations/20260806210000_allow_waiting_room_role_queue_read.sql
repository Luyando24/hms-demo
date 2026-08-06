-- Grant WAITING_ROOM role SELECT access on walkin_queue table for real-time queue display
DROP POLICY IF EXISTS walkin_queue_select ON public.walkin_queue;

CREATE POLICY walkin_queue_select ON public.walkin_queue
  FOR SELECT
  TO authenticated
  USING (private.has_role(ARRAY['ADMIN','DOCTOR','NURSE','RECEPTIONIST','WAITING_ROOM']));
