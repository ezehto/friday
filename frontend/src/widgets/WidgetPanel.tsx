import type { ReactElement } from "react";
import { BlockRenderer } from "../blocks/BlockRenderer";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import type { WidgetEnvelope } from "../generated/types";
import { formatTime, isStale } from "../lib/format";

export function WidgetPanel(props: { envelope: WidgetEnvelope; now: string; timeZone?: string }): ReactElement {
  const { envelope, now, timeZone } = props;
  const stamps = (
    <>
      {envelope.source === "sample" && <span className="stamp stamp-sample">{FIXED.stamps.sample}</span>}
      {envelope.data_class === "work" && <span className="stamp stamp-work">{FIXED.stamps.work}</span>}
      <span className="stamp">{FIXED.stamps.asOf} {formatTime(envelope.as_of, timeZone)}</span>
      {isStale(envelope.as_of, now) && <span className="stamp stamp-stale">{FIXED.stamps.stale}</span>}
    </>
  );
  return (
    <div className="widget-panel" data-widget-id={envelope.widget_id}>
      <HudFrame title={envelope.title} stamps={stamps}>
        {envelope.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </HudFrame>
    </div>
  );
}
