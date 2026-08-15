-- Migration: Add Geo-fencing configuration columns to system_settings table

ALTER TABLE public.system_settings 
  ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_latitude DOUBLE PRECISION DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS geofence_longitude DOUBLE PRECISION DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS geofence_enforce_roles TEXT[] DEFAULT ARRAY['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'ACCOUNTANT', 'STAFF'],
  ADD COLUMN IF NOT EXISTS geofence_allow_admin_bypass BOOLEAN DEFAULT true;
