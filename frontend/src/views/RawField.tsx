import { FIXED } from "../chrome/fixedText";
import { renderVisible } from "./markers";
import { Notices, Segments, VisibleText, visibleString } from "./VisibleText";

/** A value shown exactly as it is: hidden characters become visible markers, nothing is cut. The name is data too. */
export function RawField(props: { name: string; value: string }) {
  const v = renderVisible(props.value);
  return (
    <div className="raw-field">
      <span className="label raw-name"><VisibleText value={props.name} /></span>
      <pre className="raw-value" role="group" aria-label={visibleString(props.name)} tabIndex={0}>
        <Segments v={v} />
      </pre>
      <span className="raw-meta">{FIXED.raw.counts(v.lines, v.bytes)}</span>
      <Notices v={v} />
    </div>
  );
}
