import type { CSSProperties } from "react";
import type { FactsBlock as FactsBlockData } from "../generated/types";
import { Empty } from "./Empty";
import { LinkText } from "./LinkText";

export function FactsBlock({ block }: { block: FactsBlockData }) {
  return (
    <div className="block block-facts" data-block-kind="facts">
      {block.items.length === 0 ? (
        <Empty />
      ) : (
        <dl>
          {block.items.map((item, i) => (
            <div key={i} className="fact" style={{ "--bi": i } as CSSProperties}>
              <dt className="label">{item.label}</dt>
              <dd>
                {item.value}
                {item.link && (
                  <>
                    {" "}
                    <LinkText link={item.link} />
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
