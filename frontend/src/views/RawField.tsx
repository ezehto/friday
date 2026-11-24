import { FIXED } from "../chrome/fixedText";
import { renderVisible } from "./markers";

/** A value shown exactly as it is: hidden characters become visible markers, nothing is cut. */
export function RawField(props: { name: string; value: string }) {
  const v = renderVisible(props.value);
  return (
    <div className="raw-field">
      <span className="label raw-name">{props.name}</span>
      <pre className="raw-value" role="group" aria-label={props.name} tabIndex={0}>
        {v.segments.map((s, i) => (s.marker ? <span key={i} className="raw-marker">{s.text}</span> : s.text))}
      </pre>
      <span className="raw-meta">{FIXED.raw.counts(v.lines, v.bytes)}</span>
      {v.nonAscii ? <span className="raw-homoglyph" role="note">{FIXED.homoglyph}</span> : null}
    </div>
  );
}
