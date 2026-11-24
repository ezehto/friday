import type { ReactElement } from "react";
import { BlockBoundary } from "../blocks/BlockBoundary";
import { BlockRenderer, Unsupported } from "../blocks/BlockRenderer";
import { FIXED } from "../chrome/fixedText";
import { HudFrame } from "../chrome/HudFrame";
import type { WidgetEnvelope } from "../generated/types";
import { formatTime, isStale } from "../lib/format";

export function WidgetPanel(props: { envelope: WidgetEnvelope; now: string; timeZone?: string; headingLevel?: 2 | 3 | 4 }): ReactElement {
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
      <HudFrame title={envelope.title} stamps={stamps} headingLevel={props.headingLevel}>
        {Array.isArray(envelope.blocks) ? (
          envelope.blocks.map((block, i) => (
            <BlockBoundary key={i}>
              <BlockRenderer block={block} />
            </BlockBoundary>
          ))
        ) : (
          <Unsupported />
        )}
      </HudFrame>
    </div>
  );
}
