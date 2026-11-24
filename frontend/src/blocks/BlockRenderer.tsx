import type { ReactElement } from "react";
import { FIXED } from "../chrome/fixedText";
import type { Block } from "../generated/types";
import { AlertBlock } from "./Alert";
import { ChartBlock } from "./Chart";
import { ChipsBlock } from "./Chips";
import { FactsBlock } from "./Facts";
import { KanbanBlock } from "./Kanban";
import { MeterBlock } from "./Meter";
import { PersonBlock } from "./Person";
import { RowsBlock } from "./Rows";
import { TableBlock } from "./Table";
import { TextBlock } from "./Text";
import { TimelineBlock } from "./Timeline";
import { ValueBlock } from "./Value";

export function Unsupported({ kind }: { kind?: unknown }): ReactElement {
  return (
    <p className="block block-unsupported" data-block-kind={typeof kind === "string" ? kind : "unknown"}>
      {FIXED.unsupportedBlock}
    </p>
  );
}

export function BlockRenderer({ block }: { block: Block }): ReactElement {
  // Data can be null or carry a kind outside the union; neither may throw.
  if (typeof block !== "object" || block === null) return <Unsupported />;
  switch (block.kind) {
    case "value": return <ValueBlock block={block} />;
    case "chart": return <ChartBlock block={block} />;
    case "table": return <TableBlock block={block} />;
    case "rows": return <RowsBlock block={block} />;
    case "meter": return <MeterBlock block={block} />;
    case "timeline": return <TimelineBlock block={block} />;
    case "person": return <PersonBlock block={block} />;
    case "chips": return <ChipsBlock block={block} />;
    case "text": return <TextBlock block={block} />;
    case "facts": return <FactsBlock block={block} />;
    case "alert": return <AlertBlock block={block} />;
    case "kanban": return <KanbanBlock block={block} />;
    default:
      return <Unsupported kind={(block as { kind?: unknown }).kind} />;
  }
}
