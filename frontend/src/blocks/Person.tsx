import type { PersonBlock as PersonBlockData } from "../generated/types";
import { Empty } from "./Empty";

export function PersonBlock({ block }: { block: PersonBlockData }) {
  return (
    <div className="block block-person" data-block-kind="person">
      {block.people.length === 0 ? (
        <Empty />
      ) : (
        <ul>
          {block.people.map((p, i) => (
            <li key={i}>
              <span className="person-name">{p.name}</span>
              {p.role && <span className="block-muted">{p.role}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
