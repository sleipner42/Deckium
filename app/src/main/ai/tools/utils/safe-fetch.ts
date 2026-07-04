import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';

// The agent chooses these URLs, and previously-fetched web content can prompt-
// inject it. Without a guard it could reach internal services, loopback, or
// cloud metadata (169.254.169.254) from the trusted main process. These helpers
// restrict fetches to public http/https hosts.

function ipv4IsPrivate(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    return (
        a === 0 || // 0.0.0.0/8
        a === 10 || // 10.0.0.0/8
        a === 127 || // loopback
        (a === 169 && b === 254) || // link-local incl. cloud metadata
        (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
        (a === 192 && b === 168) || // 192.168.0.0/16
        (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
        a >= 224 // multicast / reserved
    );
}

function ipv6IsPrivate(ip: string): boolean {
    const addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4.
    const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipv4IsPrivate(mapped[1]);
    return (
        addr === '::1' || // loopback
        addr === '::' || // unspecified
        addr.startsWith('fe80') || // link-local
        addr.startsWith('fc') || // unique local fc00::/7
        addr.startsWith('fd')
    );
}

function ipIsPrivate(ip: string): boolean {
    const version = isIP(ip);
    if (version === 4) return ipv4IsPrivate(ip);
    if (version === 6) return ipv6IsPrivate(ip);
    return true; // not an IP → treat as unsafe
}

function hostnameIsBlocked(host: string): boolean {
    const h = host.toLowerCase();
    return h === 'localhost' || h.endsWith('.localhost');
}

/**
 * Validate that a URL is a public http/https resource, resolving DNS and
 * rejecting private/loopback/link-local/metadata targets. Throws on anything
 * unsafe. Returns the parsed URL.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('Invalid URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Only http and https URLs are allowed');
    }

    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (hostnameIsBlocked(host)) {
        throw new Error(`Refusing to fetch a local address (${host})`);
    }
    if (isIP(host)) {
        if (ipIsPrivate(host)) {
            throw new Error(`Refusing to fetch a private address (${host})`);
        }
        return url;
    }

    const records = await dns.lookup(host, { all: true });
    if (records.length === 0 || records.some((r) => ipIsPrivate(r.address))) {
        throw new Error(
            `Refusing to fetch ${host}: it resolves to a private address`,
        );
    }
    return url;
}

/**
 * Synchronous guard for axios `beforeRedirect`: blocks a redirect hop to an
 * obvious local/private target (literal IP or localhost). The initial URL is
 * already DNS-checked by assertPublicUrl.
 */
export function assertSafeRedirect(options: {
    hostname?: string;
    host?: string;
}): void {
    const host = (options.hostname || options.host || '').replace(
        /^\[|\]$/g,
        '',
    );
    if (hostnameIsBlocked(host) || (isIP(host) && ipIsPrivate(host))) {
        throw new Error(`Blocked redirect to a local address (${host})`);
    }
}
