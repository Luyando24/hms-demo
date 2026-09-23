/**
 * Network and Subnet utilities for Hospital Perimeter Security.
 * Allows verifying whether a client device is connected to the Hospital LAN/Wi-Fi.
 */

/**
 * Extracts the real client IP address from standard HTTP headers.
 */
export function getClientIp(headers: Headers): string {
  // Common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return cleanIp(firstIp);
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return cleanIp(realIp.trim());

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cleanIp(cfConnectingIp.trim());

  return '127.0.0.1';
}

/**
 * Strips IPv6 prefix if mapped IPv4 (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
 */
export function cleanIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip;
}

/**
 * Converts an IPv4 string into a 32-bit unsigned integer.
 * Returns null if not a valid IPv4 address.
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let int = 0;
  for (let i = 0; i < 4; i++) {
    const byte = Number(parts[i]);
    if (isNaN(byte) || byte < 0 || byte > 255) return null;
    int = (int << 8) | byte;
  }
  // Convert to unsigned 32-bit
  return int >>> 0;
}

/**
 * Tests whether an IP address falls within a given CIDR subnet or exact IP.
 * Supports:
 * - CIDR notation: e.g. '192.168.1.0/24', '10.0.0.0/8', '172.16.0.0/12'
 * - Exact IPv4: '192.168.1.50'
 * - IPv6 loopback / local: '::1', 'fe80::...'
 */
export function isIpInSubnet(clientIp: string, targetSubnetOrIp: string): boolean {
  const ip = cleanIp(clientIp.trim());
  const target = targetSubnetOrIp.trim();

  // 1. Direct string match
  if (ip === target) return true;

  // 2. Loopback matches
  if ((ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') &&
      (target === '127.0.0.1' || target === '::1' || target === '127.0.0.1/32' || target === '::1/128' || target === 'localhost')) {
    return true;
  }

  // 3. IPv4 CIDR matching
  if (target.includes('/')) {
    const [network, maskStr] = target.split('/');
    const maskBits = parseInt(maskStr, 10);

    if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;

    const clientInt = ipv4ToInt(ip);
    const networkInt = ipv4ToInt(network);

    if (clientInt === null || networkInt === null) return false;

    // Special case for /0
    if (maskBits === 0) return true;

    // Create bitmask: e.g. for /24 -> 0xFFFFFF00
    const mask = ((0xFFFFFFFF << (32 - maskBits)) >>> 0);
    return (clientInt & mask) === (networkInt & mask);
  }

  // 4. Wildcard matching (e.g. 192.168.1.*)
  if (target.endsWith('.*')) {
    const prefix = target.slice(0, -1); // e.g. '192.168.1.'
    return ip.startsWith(prefix);
  }

  return false;
}

/**
 * Default internal hospital network subnets (RFC 1918 private ranges & loopback)
 */
export const DEFAULT_HOSPITAL_SUBNETS = [
  '192.168.0.0/16', // Standard Clinic Wi-Fi & LAN (192.168.0.1 - 192.168.255.254)
  '10.0.0.0/8',     // Enterprise hospital switches (10.0.0.0 - 10.255.255.255)
  '172.16.0.0/12',  // Mid-sized clinic subnets (172.16.0.0 - 172.31.255.255)
  '127.0.0.1/32',   // Local development & on-premises server loopback
  '::1/128',        // IPv6 loopback
];

/**
 * Checks whether a given client IP is on any of the allowed hospital networks.
 */
export function isClientOnHospitalNetwork(
  clientIp: string,
  allowedSubnets: string[] = DEFAULT_HOSPITAL_SUBNETS,
  allowedIps: string[] = []
): boolean {
  if (!clientIp) return false;

  const subnetsToCheck = allowedSubnets && allowedSubnets.length > 0
    ? allowedSubnets
    : DEFAULT_HOSPITAL_SUBNETS;

  // Check subnets
  for (const subnet of subnetsToCheck) {
    if (isIpInSubnet(clientIp, subnet)) {
      return true;
    }
  }

  // Check explicit public / WAN IPs
  if (allowedIps && allowedIps.length > 0) {
    for (const exactIp of allowedIps) {
      if (cleanIp(clientIp) === cleanIp(exactIp.trim())) {
        return true;
      }
    }
  }

  return false;
}
