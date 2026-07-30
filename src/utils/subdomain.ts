export type Subdomain = 'patient' | 'staff' | 'admin' | null;

/**
 * Retrieves the root domain host (without protocol) from environment variables.
 * Checks NEXT_PUBLIC_ROOT_DOMAIN first, then NEXT_PUBLIC_APP_URL.
 */
export function getRootDomain(): string {
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    return process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.host;
    } catch {
      // Fallback if parsing fails
    }
  }
  return 'localhost:3000';
}

/**
 * Extracts the subdomain from the request Host header.
 * Supports patient, staff, and admin subdomains for both localhost and production domains.
 */
export function getSubdomain(host: string | null): Subdomain {
  if (!host) return null;

  // Remove port if present (e.g., patient.localhost:3000 -> patient.localhost)
  const hostname = host.split(':')[0].toLowerCase();
  
  // Get configured root domain host without port
  const envRoot = getRootDomain();
  const rootDomain = envRoot.split(':')[0].toLowerCase();

  // 1. Handle *.localhost format (e.g. patient.localhost)
  if (hostname.endsWith('.localhost')) {
    const parts = hostname.split('.');
    const sub = parts[0];
    if (sub === 'patient' || sub === 'staff' || sub === 'admin') {
      return sub;
    }
  }

  // 2. Handle root domain subdomains (e.g. patient.domain.com)
  if (hostname !== rootDomain && hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.replace(`.${rootDomain}`, '');
    if (sub === 'patient' || sub === 'staff' || sub === 'admin') {
      return sub;
    }
  }

  // 3. Fallback prefix check
  if (hostname.startsWith('patient.')) return 'patient';
  if (hostname.startsWith('staff.')) return 'staff';
  if (hostname.startsWith('admin.')) return 'admin';

  return null;
}

/**
 * Constructs a full URL for a specific subdomain and path.
 */
export function getSubdomainUrl(subdomain: Subdomain, path: string = '/'): string {
  const rootDomain = getRootDomain();
  let protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const parsedUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
      protocol = parsedUrl.protocol.replace(':', '');
    } catch {
      // Use fallback protocol
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!subdomain) {
    return `${protocol}://${rootDomain}${cleanPath}`;
  }

  return `${protocol}://${subdomain}.${rootDomain}${cleanPath}`;
}
