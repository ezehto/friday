import type { TrayItem } from "../generated/types";
import { FIXED } from "./fixedText";

/** The count fills {n}; without one the number and its space are dropped. */
function trayText(item: TrayItem): string {
  const template: string = FIXED.tray[item.kind];
  return item.count === undefined ? template.replace("{n} ", "") : template.replace("{n}", String(item.count));
}

export function Tray(props: { items: TrayItem[] }) {
  if (props.items.length === 0) return <p className="tray-empty">{FIXED.chrome.trayEmpty}</p>;
  return (
    <ul className="tray" aria-label={FIXED.chrome.bell}>
      {props.items.map((item, i) => (
        <li key={`${item.kind}-${i}`} className="tray-row">
          <span className="tray-text">{trayText(item)}</span>
          <span className="tray-chips">
            <span className="chip label">{item.kind.replaceAll("_", " ")}</span>
            <span className="chip label">{item.source}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
