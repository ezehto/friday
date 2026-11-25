import { ToneIcon } from "../chrome/ToneIcon";
import type { TextBlock as TextBlockData } from "../generated/types";

export function TextBlock({ block }: { block: TextBlockData }) {
  return (
    <div className="block block-text" data-block-kind="text" data-tone={block.tone}>
      {block.tone && <ToneIcon tone={block.tone} />}
      <p>{block.text}</p>
    </div>
  );
}
