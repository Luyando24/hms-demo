import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from './supabase/admin';

export interface TrustedWorkstation {
  id: string;
  name: string;
  is_active: boolean;
  ip_address?: string | null;
  user_agent?: string | null;
  last_used_at?: string | null;
  created_at: string;
}

/**
 * Computes a SHA-256 hash of a raw workstation token.
 * We only store the hash in the database to prevent token leakage.
 */
export function hashWorkstationToken(rawToken: string): string {
  return createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Generates a new secure workstation enrollment token.
 * Returns the raw token (to be sent once to the device) and its hash (to store in DB).
 */
export function generateWorkstationToken(): { rawToken: string; tokenHash: string } {
  // Format: wks_<32 random hex chars>
  const rawToken = `wks_${randomBytes(24).toString('hex')}`;
  const tokenHash = hashWorkstationToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Verifies a raw token against the trusted_workstations database table.
 * If valid and active, updates `last_used_at` timestamp.
 */
export async function verifyWorkstationToken(
  rawToken: string | null | undefined
): Promise<{ valid: boolean; workstation?: TrustedWorkstation }> {
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.startsWith('wks_')) {
    return { valid: false };
  }

  try {
    const tokenHash = hashWorkstationToken(rawToken);
    const adminSupabase = createAdminClient();

    const { data, error } = await (adminSupabase as any)
      .from('trusted_workstations')
      .select('id, name, is_active, ip_address, user_agent, last_used_at, created_at')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { valid: false };
    }

    // Update last_used_at asynchronously
    void (adminSupabase as any)
      .from('trusted_workstations')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      valid: true,
      workstation: data as TrustedWorkstation,
    };
  } catch (err) {
    console.error('Error verifying workstation token:', err);
    return { valid: false };
  }
}

/** Client-side constant for token key */
export const WORKSTATION_STORAGE_KEY = 'hms_workstation_token';
export const WORKSTATION_COOKIE_NAME = 'hms_workstation_token';
