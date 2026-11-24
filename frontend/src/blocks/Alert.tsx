import { ToneIcon } from "../chrome/ToneIcon";
import { FIXED } from "../chrome/fixedText";
import type { AlertBlock as AlertBlockData } from "../generated/types";
import { toHash, useRoute } from "../router";

export function AlertBlock({ block }: { block: AlertBlockData }) {
  const route = useRoute();
  // "modules" is not a View yet (F28): same query, path falls back to the board until L8.
  const href = block.view === "modules" ? toHash({ ...route, view: "board" }).replace("#/board", "#/modules") : block.view ? toHash({ ...route, view: block.view }) : "";
  return (
    <div className="block block-alert" data-block-kind="alert" data-tone={block.level}>
      <ToneIcon tone={block.level} showWord />
      <p>{block.text}</p>
      {block.view && <a href={href}>{FIXED.alertView[block.view]}</a>}
    </div>
  );
}
