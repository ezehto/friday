import { ToneIcon } from "../chrome/ToneIcon";
import type { TimelineBlock as TimelineBlockData } from "../generated/types";
import { Empty } from "./Empty";

export function TimelineBlock({ block }: { block: TimelineBlockData }) {
  return (
    <div className="block block-timeline" data-block-kind="timeline">
      {block.items.length === 0 ? (
        <Empty />
      ) : (
        <ol>
          {block.items.map((item, i) => (
            <li key={i} data-tone={item.tone}>
              <span className="row-meta">{item.when}</span>
              <div>
                <p className="timeline-title">
                  {item.tone && <ToneIcon tone={item.tone} />}
                  <span>{item.title}</span>
                </p>
                {item.detail && <p className="block-muted">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
