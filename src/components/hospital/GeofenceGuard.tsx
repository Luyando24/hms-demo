'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, MapPin, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { isLocationWithinGeofence, formatDistance, type GeofenceConfig } from '@/utils/geofence';

export function GeofenceGuard() {
  const [config, setConfig] = useState<GeofenceConfig | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [outOfBounds, setOutOfBounds] = useState<{ distance: string; limit: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const performLocationCheck = (role: string, geoConfig: GeofenceConfig) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const check = isLocationWithinGeofence(
            pos.coords.latitude,
            pos.coords.longitude,
            role,
            geoConfig
          );

          if (!check.allowed && check.reason === 'out-of-bounds') {
            setOutOfBounds({
              distance: check.formattedDistance,
              limit: check.formattedLimit,
            });
          } else {
            setOutOfBounds(null);
          }
        },
        (err) => {
          console.warn('Geofence guard position check skipped:', err.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    const initGuard = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role?.toUpperCase() || 'STAFF';
      setUserRole(role);

      const { data: settings } = await supabase
        .from('system_settings')
        .select('geofence_enabled, geofence_latitude, geofence_longitude, geofence_radius_meters, geofence_enforce_roles, geofence_allow_admin_bypass')
        .limit(1)
        .maybeSingle();

      if (settings && settings.geofence_enabled) {
        const geoConfig: GeofenceConfig = {
          enabled: settings.geofence_enabled,
          latitude: (settings.geofence_latitude && settings.geofence_latitude !== 0) ? settings.geofence_latitude : -15.3875,
          longitude: (settings.geofence_longitude && settings.geofence_longitude !== 0) ? settings.geofence_longitude : 28.3228,
          radiusMeters: settings.geofence_radius_meters ?? 500,
          enforceRoles: (settings.geofence_enforce_roles as string[]) || [],
          allowAdminBypass: settings.geofence_allow_admin_bypass ?? true,
        };
        setConfig(geoConfig);

        // Initial check
        performLocationCheck(role, geoConfig);

        // Re-check every 3 minutes
        intervalId = setInterval(() => {
          performLocationCheck(role, geoConfig);
        }, 180000);

        // Re-check on tab focus / visibility change
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            performLocationCheck(role, geoConfig);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    };

    void initGuard();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (!config || !config.enabled || !outOfBounds || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-amber-900/95 backdrop-blur-md text-amber-50 p-4 rounded-2xl border border-amber-700/50 shadow-2xl flex items-start gap-3">
        <div className="p-2 bg-amber-800 rounded-xl shrink-0 text-amber-300">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-200">
            <MapPin size={14} className="text-amber-400" />
            Geofence Perimeter Alert
          </div>
          <p className="text-xs text-amber-100/90 mt-1 font-medium leading-relaxed">
            Your current device location is outside the facility perimeter (Distance: <span className="font-bold text-white">{outOfBounds.distance}</span>, Limit: <span className="font-bold text-white">{outOfBounds.limit}</span>). Please remain within hospital premises during shift.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-white transition-colors shrink-0 p-1"
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
