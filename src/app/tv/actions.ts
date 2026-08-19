'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSubdomainUrl } from '@/utils/subdomain';

export interface TvCodeItem {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_connected_at: string | null;
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return profile?.role?.toUpperCase() === 'ADMIN';
  } catch {
    return false;
  }
}

export async function generateTvBroadcastCode(displayName: string = 'OPD Waiting Room TV') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can generate TV connection codes.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Generate unique 6-character code e.g. TV-849201
  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  const code = `TV-${randomDigits}`;

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('tv_broadcast_codes')
    .insert({
      code,
      name: displayName || 'OPD Waiting Room TV',
      created_by: user?.id ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to generate TV broadcast code:', error);
    return { ok: false, error: 'Failed to save TV connection code.' };
  }

  const directUrl = getSubdomainUrl('staff', `/tv?code=${code}`);
  return {
    ok: true,
    data: data as TvCodeItem,
    directUrl,
  };
}

export async function revokeTvBroadcastCode(id: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can revoke TV connection codes.' };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from('tv_broadcast_codes')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return { ok: false, error: 'Failed to revoke TV connection code.' };
  }

  return { ok: true };
}

export async function getTvBroadcastCodes() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized', data: [] };
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from('tv_broadcast_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message, data: [] };
  }

  return { ok: true, data: (data as TvCodeItem[]) || [] };
}

export async function verifyTvBroadcastCode(code: string) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Please enter a connection code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from('tv_broadcast_codes')
    .select('id, name, is_active')
    .eq('code', cleanCode)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return {
      valid: false,
      message: 'Invalid or revoked TV connection code. Please request a new activation code from your Administrator.',
    };
  }

  // Update last_connected_at asynchronously
  void adminSupabase
    .from('tv_broadcast_codes')
    .update({ last_connected_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true,
    name: data.name,
    code: cleanCode,
  };
}
