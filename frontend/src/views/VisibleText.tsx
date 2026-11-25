import { FIXED } from "../chrome/fixedText";
import { renderVisible, type Visible } from "./markers";

export const visibleString = (value: string): string => renderVisible(value).segments.map((s) => s.text).join("");

function Segments({ v }: { v: Visible }) {
  return <>{v.segments.map((s, i) => (s.marker ? <span key={i} className="raw-marker">{s.text}</span> : s.text))}</>;
}

function Notices({ v }: { v: Visible }) {
  return (
    <>
      {v.hidden ? <span className="raw-homoglyph">{FIXED.invisible}</span> : null}
      {v.nonAscii ? <span className="raw-homoglyph">{FIXED.homoglyph}</span> : null}
    </>
  );
}

/** Compact inline text from data: hidden characters become markers, a notice follows when needed. */
export function VisibleText({ value }: { value: string }) {
  const v = renderVisible(value);
  return (
    <>
      <span className="visible-text"><Segments v={v} /></span>
      <Notices v={v} />
    </>
  );
}

export { Segments, Notices };
