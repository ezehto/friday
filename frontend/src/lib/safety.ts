// Links to local services could steer the owner to the host companion or other local ports.
function isLocalHost(host: string): boolean {
  // A trailing dot is still the same host to browsers and the OS ("localhost.").
  const h = host.replace(/\.+$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.startsWith("[")) return isLocalV6(h.slice(1, -1));
  return isLocalV4(h);
}

function isLocalV4(host: string): boolean {
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 127 || a === 0 || a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isLocalV6(h: string): boolean {
  if (h === "::1" || h === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h)) return true;
  // WHATWG rewrites an embedded IPv4 (mapped, compatible, SIIT, NAT64) as two hex groups, so read them back as an IPv4 address.
  const m = /^(?:::(?:ffff:(?:0:)?)?|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (!m) return false;
  const hi = parseInt(m[1]!, 16);
  const lo = parseInt(m[2]!, 16);
  return isLocalV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
}

export function safeLink(url: string): { href: string; host: string } | null {
  if (url !== url.trim()) return null;
  // Same rule as the server schema (common.schema.json Link.url).
  if (url.length > 2048 || !/^https?:\/\//.test(url)) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (isLocalHost(u.hostname)) return null;
    return { href: u.href, host: u.hostname };
  } catch {
    return null;
  }
}
