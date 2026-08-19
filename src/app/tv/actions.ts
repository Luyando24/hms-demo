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

const TV_CODE_PREFIX = 'TVCODE:';

async function getSystemSettingsTvCodes(): Promise<{ settingsId: string; codes: TvCodeItem[]; rawProviders: string[] }> {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from('system_settings')
    .select('id, insurance_providers')
    .limit(1)
    .maybeSingle();

  const rawProviders = data?.insurance_providers || [];
  const tvCodes: TvCodeItem[] = [];

  for (const item of rawProviders) {
    if (item.startsWith(TV_CODE_PREFIX)) {
      try {
        const parsed = JSON.parse(item.slice(TV_CODE_PREFIX.length));
        if (parsed && parsed.code) {
          tvCodes.push(parsed);
        }
      } catch {
        // Skip invalid entries
      }
    }
  }

  return {
    settingsId: data?.id || '',
    codes: tvCodes,
    rawProviders,
  };
}

async function saveSystemSettingsTvCodes(tvCodes: TvCodeItem[]) {
  const adminSupabase = createAdminClient();
  const { settingsId, rawProviders } = await getSystemSettingsTvCodes();

  const nonTvItems = rawProviders.filter((p) => !p.startsWith(TV_CODE_PREFIX));
  const newTvItems = tvCodes.map((c) => `${TV_CODE_PREFIX}${JSON.stringify(c)}`);
  const updatedProviders = [...nonTvItems, ...newTvItems];

  if (settingsId) {
    await adminSupabase
      .from('system_settings')
      .update({ insurance_providers: updatedProviders })
      .eq('id', settingsId);
  }
}

export async function generateTvBroadcastCode(displayName: string = 'OPD Waiting Room TV') {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can generate TV connection codes.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  const code = `TV-${randomDigits}`;
  const newItem: TvCodeItem = {
    id: `tv-${Date.now()}-${randomDigits}`,
    code,
    name: displayName || 'OPD Waiting Room TV',
    is_active: true,
    created_at: new Date().toISOString(),
    last_connected_at: null,
  };

  const adminSupabase = createAdminClient();
  const directUrl = getSubdomainUrl('staff', `/tv?code=${code}`);

  // 1. Try dedicated table first
  try {
    const { data, error } = await adminSupabase
      .from('tv_broadcast_codes')
      .insert({
        code: newItem.code,
        name: newItem.name,
        created_by: user?.id ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      return {
        ok: true,
        data: data as TvCodeItem,
        directUrl,
      };
    }
  } catch {
    // Fall back below
  }

  // 2. Fallback to system_settings if PostgREST schema cache has not loaded tv_broadcast_codes
  const { codes } = await getSystemSettingsTvCodes();
  const updatedCodes = [newItem, ...codes];
  await saveSystemSettingsTvCodes(updatedCodes);

  return {
    ok: true,
    data: newItem,
    directUrl,
  };
}

export async function revokeTvBroadcastCode(id: string) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized: Only Administrators can revoke TV connection codes.' };
  }

  const adminSupabase = createAdminClient();
  try {
    await adminSupabase
      .from('tv_broadcast_codes')
      .update({ is_active: false })
      .eq('id', id);
  } catch {
    // Ignore error and run fallback
  }

  // Fallback update in system_settings
  const { codes } = await getSystemSettingsTvCodes();
  const updatedCodes = codes.map((c) => (c.id === id || c.code === id ? { ...c, is_active: false } : c));
  await saveSystemSettingsTvCodes(updatedCodes);

  return { ok: true };
}

export async function getTvBroadcastCodes() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return { ok: false, error: 'Unauthorized', data: [] };
  }

  const adminSupabase = createAdminClient();
  try {
    const { data, error } = await adminSupabase
      .from('tv_broadcast_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return { ok: true, data: data as TvCodeItem[] };
    }
  } catch {
    // Fall back below
  }

  // Fallback read
  const { codes } = await getSystemSettingsTvCodes();
  return { ok: true, data: codes };
}

export async function verifyTvBroadcastCode(code: string) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Please enter a connection code.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const adminSupabase = createAdminClient();

  // 1. Try table check
  try {
    const { data, error } = await adminSupabase
      .from('tv_broadcast_codes')
      .select('id, name, is_active')
      .eq('code', cleanCode)
      .maybeSingle();

    if (!error && data) {
      if (!data.is_active) {
        return {
          valid: false,
          message: 'Invalid or revoked TV connection code. Please request a new activation code from your Administrator.',
        };
      }

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
  } catch {
    // Fall back below
  }

  // 2. Fallback check from system_settings
  const { codes } = await getSystemSettingsTvCodes();
  const matched = codes.find((c) => c.code.toUpperCase() === cleanCode && c.is_active);

  if (matched) {
    matched.last_connected_at = new Date().toISOString();
    void saveSystemSettingsTvCodes(codes);
    return {
      valid: true,
      name: matched.name,
      code: cleanCode,
    };
  }

  return {
    valid: false,
    message: 'Invalid or revoked TV connection code. Please request a new activation code from your Administrator.',
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
