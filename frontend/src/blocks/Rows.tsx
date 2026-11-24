import type { CSSProperties } from "react";
import { ToneIcon } from "../chrome/ToneIcon";
import type { RowsBlock as RowsBlockData } from "../generated/types";
import { Empty } from "./Empty";
import { LinkText } from "./LinkText";

export function RowsBlock({ block }: { block: RowsBlockData }) {
  const log = block.variant === "log";
  return (
    <div className={`block block-rows${log ? " block-rows-log" : ""}`} data-block-kind="rows">
      {block.heading && <h3 className="label block-heading">{block.heading}</h3>}
      {block.items.length === 0 ? (
        <Empty />
      ) : (
        <ol>
          {block.items.map((item, i) => (
            <li key={i} data-tone={item.tone} style={{ "--bi": i } as CSSProperties}>
              {log ? (
                <>
                  {item.meta && <span className="row-meta">{item.meta}</span>}
                  <span className="row-text">
                    <span className="row-label">{item.label}</span>
                    {item.detail && <span className="row-detail block-muted">{item.detail}</span>}
                    {item.link && <span className="row-detail"><LinkText link={item.link} /></span>}
                  </span>
                  {item.tone && <ToneIcon tone={item.tone} />}
                </>
              ) : (
                <>
                  <div className="row-main">
                    {item.tone && <ToneIcon tone={item.tone} />}
                    <span className="row-label">{item.label}</span>
                    {item.meta && <span className="row-meta">{item.meta}</span>}
                  </div>
                  {item.detail && <p className="block-muted">{item.detail}</p>}
                  {item.link && (
                    <p>
                      <LinkText link={item.link} />
                    </p>
                  )}
                </>
              )}
              {item.source_ref && <p className="row-source">{item.source_ref}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
