import type { CSSProperties } from "react";
import { ToneIcon } from "../chrome/ToneIcon";
import type { ChipsBlock as ChipsBlockData } from "../generated/types";
import { Empty } from "./Empty";

export function ChipsBlock({ block }: { block: ChipsBlockData }) {
  return (
    <div className="block block-chips" data-block-kind="chips">
      {block.items.length === 0 ? (
        <Empty />
      ) : (
        <ul>
          {block.items.map((item, i) => (
            <li key={i} className="chip" data-tone={item.tone} style={{ "--bi": i } as CSSProperties}>
              {item.tone && <ToneIcon tone={item.tone} />}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
