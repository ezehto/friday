export function safeLink(url: string): { href: string; host: string } | null {
  if (url !== url.trim()) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    return { href: u.href, host: u.hostname };
  } catch {
    return null;
  }
}
