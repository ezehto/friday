import { ToneIcon } from "../chrome/ToneIcon";
import { FIXED } from "../chrome/fixedText";
import type { AlertBlock as AlertBlockData } from "../generated/types";

export function AlertBlock({ block }: { block: AlertBlockData }) {
  return (
    <div className="block block-alert" data-block-kind="alert" data-tone={block.level}>
      <ToneIcon tone={block.level} showWord />
      <p>{block.text}</p>
      {block.view && <a href={`#/${block.view}`}>{FIXED.alertView[block.view]}</a>}
    </div>
  );
}
