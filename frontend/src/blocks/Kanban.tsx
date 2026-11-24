import type { KanbanBlock as KanbanBlockData } from "../generated/types";
import { Empty } from "./Empty";

export function KanbanBlock({ block }: { block: KanbanBlockData }) {
  return (
    <div className="block block-kanban" data-block-kind="kanban">
      {block.columns.length === 0 ? (
        <Empty />
      ) : (
        <div className="kanban-columns">
          {block.columns.map((col, i) => (
            <section key={i} className="kanban-column">
              <h3 className="label">{col.title}</h3>
              {col.items.length === 0 ? (
                <Empty />
              ) : (
                <ul>
                  {col.items.map((item, j) => (
                    <li key={j}>
                      <span>{item.label}</span>
                      {item.meta && <span className="row-meta">{item.meta}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
