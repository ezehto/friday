import { ToneIcon } from "../chrome/ToneIcon";
import type { MeterBlock as MeterBlockData } from "../generated/types";
import { Empty } from "./Empty";

function percent(done: number, total: number): number {
  const p = total > 0 ? (done / total) * 100 : 0;
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
}

export function MeterBlock({ block }: { block: MeterBlockData }) {
  return (
    <div className="block block-meter" data-block-kind="meter">
      {block.items.length === 0 ? (
        <Empty />
      ) : (
        <ul>
          {block.items.map((item, i) => (
            <li key={i} data-tone={item.tone}>
              <div className="meter-head">
                <span>{item.label}</span>
                {item.tone && <ToneIcon tone={item.tone} />}
                <span className="row-meta">
                  {item.done} / {item.total}
                </span>
              </div>
              <div className="meter-bar" aria-hidden="true">
                <div className="meter-bar-fill" style={{ width: `${percent(item.done, item.total)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
