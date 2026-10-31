'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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

const TV_CODE_PREFIX = 'TVCODE:';

async function syncAndCleanLegacyTvCodes(adminSupabase: any) {
  try {
    const { data } = await adminSupabase
      .from('system_settings')
      .select('id, insurance_providers')
      .limit(1)
      .maybeSingle();

    if (!data?.insurance_providers || !Array.isArray(data.insurance_providers)) return;
    const raw = data.insurance_providers as string[];
    const hasLegacy = raw.some((item) => typeof item === 'string' && item.startsWith(TV_CODE_PREFIX));
    if (!hasLegacy) return;

    // Migrate any legacy TV codes to tv_broadcast_codes table
    for (const item of raw) {
      if (typeof item === 'string' && item.startsWith(TV_CODE_PREFIX)) {
        try {
          const parsed = JSON.parse(item.slice(TV_CODE_PREFIX.length));
          if (parsed && parsed.code) {
            const { data: existing } = await adminSupabase
              .from('tv_broadcast_codes')
              .select('id')
              .eq('code', parsed.code)
              .maybeSingle();
            if (!existing) {
              await adminSupabase.from('tv_broadcast_codes').insert({
                code: parsed.code,
                name: parsed.name || 'Smart TV Display',
                is_active: parsed.is_active ?? true,
                created_at: parsed.created_at || new Date().toISOString(),
                last_connected_at: parsed.last_connected_at || null,
              });
            }
          }
        } catch {
          // Skip malformed entries
        }
      }
    }

    // Clean system_settings.insurance_providers so it contains ONLY legitimate insurance provider names
    const cleaned = raw.filter((item) => typeof item === 'string' && !item.startsWith(TV_CODE_PREFIX) && item.trim().length > 0);
    const finalProviders = cleaned.length > 0 ? cleaned : ['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'];
    await adminSupabase
      .from('system_settings')
      .update({ insurance_providers: finalProviders })
      .eq('id', data.id);
  } catch (err) {
    console.error('Error during legacy TV code sync/cleanup:', err);
  }
}

export async function generateTvBroadcastCode(displayName: string = 'OPD Waiting Room TV') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can generate TV connection codes.' };
  }

  const adminSupabase = createAdminClient();
  await syncAndCleanLegacyTvCodes(adminSupabase);

  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  const code = `TV-${randomDigits}`;

  const { data, error } = await (adminSupabase as any)
    .from('tv_broadcast_codes')
    .insert({
      code,
      name: displayName?.trim() || 'OPD Waiting Room TV',
      is_active: true,
    })
    .select('id, code, name, is_active, created_at, last_connected_at')
    .single();

  if (error || !data) {
    console.error('Failed to insert TV broadcast code into tv_broadcast_codes table:', error);
    return { ok: false, error: error?.message || 'Failed to generate TV broadcast code.' };
  }

  return {
    ok: true,
    data: data as TvCodeItem,
  };
}

export async function revokeTvBroadcastCode(id: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can revoke TV connection codes.' };
  }

  const adminSupabase = createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const query = (adminSupabase as any).from('tv_broadcast_codes').update({ is_active: false });
  const { error } = isUuid ? await query.eq('id', id) : await query.eq('code', id);

  if (error) {
    console.error('Error revoking TV broadcast code:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getTvBroadcastCodes() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized', data: [] };
  }

  const adminSupabase = createAdminClient();
  await syncAndCleanLegacyTvCodes(adminSupabase);

  const { data, error } = await (adminSupabase as any)
    .from('tv_broadcast_codes')
    .select('id, code, name, is_active, created_at, last_connected_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching TV broadcast codes:', error);
    return { ok: false, error: error.message, data: [] };
  }

  return { ok: true, data: (data || []) as TvCodeItem[] };
}

export async function verifyTvBroadcastCode(code: string) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Please enter a connection code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const adminSupabase = createAdminClient();

  const { data, error } = await (adminSupabase as any)
    .from('tv_broadcast_codes')
    .select('id, code, name, is_active')
    .ilike('code', cleanCode)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      message: 'Invalid TV connection code. Please check the code and try again.',
    };
  }

  if (!data.is_active) {
    return {
      valid: false,
      message: 'This TV connection code was revoked by an Administrator. Please request a new activation code.',
    };
  }

  await (adminSupabase as any)
    .from('tv_broadcast_codes')
    .update({ last_connected_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true,
    name: data.name,
    code: cleanCode,
  };
}

export async function checkTvCodeStatus(code: string): Promise<{ valid: boolean; name?: string; message?: string }> {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Missing TV connection code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const adminSupabase = createAdminClient();

  const { data, error } = await (adminSupabase as any)
    .from('tv_broadcast_codes')
    .select('id, code, name, is_active, last_connected_at')
    .ilike('code', cleanCode)
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      message: 'This TV connection code does not exist.',
    };
  }

  if (!data.is_active) {
    return {
      valid: false,
      message: 'This TV connection code was manually revoked by an Administrator.',
    };
  }

  // Throttled update of last_connected_at (at most once every 5 minutes to avoid excessive DB writes)
  const now = Date.now();
  const lastConnectedTime = data.last_connected_at ? new Date(data.last_connected_at).getTime() : 0;
  if (now - lastConnectedTime > 5 * 60 * 1000) {
    void (adminSupabase as any)
      .from('tv_broadcast_codes')
      .update({ last_connected_at: new Date(now).toISOString() })
      .eq('id', data.id);
  }

  return {
    valid: true,
    name: data.name,
  };
}

export async function fetchTvQueueData() {
  try {
    const adminSupabase = createAdminClient();
    const { data: queueData, error } = await adminSupabase
      .from('walkin_queue')
      .select('*, patients(first_name, last_name, file_number), rooms(id, name), departments(id, name)')
      .in('status', ['WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION'])
      .order('created_at', { ascending: true });

    const { data: roomsData } = await adminSupabase
      .from('rooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to fetch TV queue data via admin client:', error);
      return { ok: false, queueData: [], roomsData: [] };
    }

    return {
      ok: true,
      queueData: queueData || [],
      roomsData: roomsData || [],
    };
  } catch (err) {
    console.error('Error fetching TV queue data:', err);
    return { ok: false, queueData: [], roomsData: [] };
  }
}
