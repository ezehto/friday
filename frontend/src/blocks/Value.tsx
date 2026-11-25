import { ToneIcon } from "../chrome/ToneIcon";
import type { ValueBlock as ValueBlockData } from "../generated/types";

export function ValueBlock({ block }: { block: ValueBlockData }) {
  return (
    <div className="block block-value" data-block-kind="value" data-tone={block.tone}>
      <p className="label block-value-label">{block.label}</p>
      <p className="block-value-figure">
        <span className="block-value-number">{block.value}</span>
        {block.unit && <span className="block-value-unit">{block.unit}</span>}
      </p>
      {(block.change || block.tone) && (
        <p className="block-value-change">
          {block.tone && <ToneIcon tone={block.tone} />}
          {block.change && <span>{block.change}</span>}
        </p>
      )}
      {block.hint && <p className="block-muted">{block.hint}</p>}
    </div>
  );
}
