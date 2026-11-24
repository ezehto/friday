export type Segment = { text: string; marker: boolean };
/** `hidden`: a marker was drawn. `nonAscii`: an unmarked letter above U+007F, a possible look-alike. */
export type Visible = { segments: Segment[]; lines: number; bytes: number; nonAscii: boolean; hidden: boolean };

const hex = (code: number): string => code.toString(16).toUpperCase().padStart(4, "0");
const HIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Co}\p{Cs}\p{Noncharacter_Code_Point}\p{Default_Ignorable_Code_Point}]/u;
const MARK = /\p{M}/u;
const LETTER = /\p{L}/u;

/** The marker for one code point, or null when it is ordinary text. LF is a line break, never a marker. */
function markerFor(cp: number, ch: string): string | null {
  if (cp === 0x0a) return null;
  if (cp >= 0x20 && cp < 0x7f) return null;
  if (cp === 0x0d) return "[CR]";
  if (cp === 0x09) return "[TAB]";
  if (cp === 0x1b) return "[ESC]";
  if (cp === 0x061c || cp === 0x200e || cp === 0x200f || (cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069)) return `[BIDI U+${hex(cp)}]`;
  if (cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0x2060 || cp === 0xfeff) return `[ZW U+${hex(cp)}]`;
  return HIDDEN.test(ch) ? `[U+${hex(cp)}]` : null;
}

/** One pass by code point: ordinary runs stay single strings, each hidden character is its own marker segment. */
export function renderVisible(raw: string): Visible {
  const segments: Segment[] = [];
  let plainFrom = 0;
  let markFrom = 0;
  let markCount = 0;
  let breaks = 0;
  let nonAscii = false;
  let hidden = false;
  let i = 0;
  const pushPlain = (to: number): void => {
    if (to > plainFrom) segments.push({ text: raw.slice(plainFrom, to), marker: false });
  };
  const pushMarker = (text: string): void => {
    segments.push({ text, marker: true });
    hidden = true;
  };
  // A run of more than two combining marks hides text behind the base letter, so it becomes one marker.
  const closeMarks = (end: number): void => {
    if (markCount > 2) {
      plainFrom = Math.min(plainFrom, markFrom);
      pushPlain(markFrom);
      pushMarker(`[MARKS x${markCount}]`);
      plainFrom = end;
    }
    markCount = 0;
  };
  for (const ch of raw) {
    const cp = ch.codePointAt(0)!;
    const marker = markerFor(cp, ch);
    if (cp === 0x0a || cp === 0x2028 || cp === 0x2029) breaks++;
    if (marker !== null) {
      closeMarks(i);
      pushPlain(i);
      pushMarker(marker);
      plainFrom = i + ch.length;
    } else if (cp > 0x7f && MARK.test(ch)) {
      if (markCount === 0) markFrom = i;
      markCount++;
    } else {
      closeMarks(i);
      if (cp > 0x7f && LETTER.test(ch)) nonAscii = true;
    }
    i += ch.length;
  }
  closeMarks(i);
  pushPlain(i);
  return { segments, lines: raw === "" ? 0 : breaks + 1, bytes: new TextEncoder().encode(raw).length, nonAscii, hidden };
}
