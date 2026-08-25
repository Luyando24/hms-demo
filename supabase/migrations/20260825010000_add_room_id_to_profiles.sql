-- Migration: Add room_id to public.profiles
-- This enables assigning staff members to consulting rooms and synchronizing active room state.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_room_id_idx ON public.profiles(room_id);
