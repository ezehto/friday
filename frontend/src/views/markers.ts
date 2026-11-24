export type Segment = { text: string; marker: boolean };
export type Visible = { segments: Segment[]; lines: number; bytes: number; nonAscii: boolean };

const hex = (code: number): string => code.toString(16).toUpperCase().padStart(4, "0");

/** The marker for one UTF-16 unit, or null when it is ordinary text. Every marked character is in the BMP, so a surrogate pair is never split. */
function markerFor(c: number): string | null {
  if (c === 0x0a) return null;
  if (c === 0x0d) return "[CR]";
  if (c === 0x09) return "[TAB]";
  if (c === 0x1b) return "[ESC]";
  if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) return `[U+${hex(c)}]`;
  if (c === 0x061c || c === 0x200e || c === 0x200f || (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069)) return `[BIDI U+${hex(c)}]`;
  if (c === 0x200b || c === 0x200c || c === 0x200d || c === 0x2060 || c === 0xfeff) return `[ZW U+${hex(c)}]`;
  return null;
}

/** One pass: ordinary runs stay as single strings, each hidden character becomes its own marker segment. */
export function renderVisible(raw: string): Visible {
  const segments: Segment[] = [];
  let start = 0;
  let lf = 0;
  let nonAscii = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c > 0x7f) nonAscii = true;
    if (c === 0x0a) lf++;
    const marker = markerFor(c);
    if (marker === null) continue;
    if (i > start) segments.push({ text: raw.slice(start, i), marker: false });
    segments.push({ text: marker, marker: true });
    start = i + 1;
  }
  if (start < raw.length) segments.push({ text: raw.slice(start), marker: false });
  return { segments, lines: raw === "" ? 0 : lf + 1, bytes: new TextEncoder().encode(raw).length, nonAscii };
}
