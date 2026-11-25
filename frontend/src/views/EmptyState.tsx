import { HudFrame } from "../chrome/HudFrame";

/** The one empty state of every view: a frame named for what is missing, with the fixed empty text. */
export function EmptyState(props: { title: string; text: string }) {
  return (
    <HudFrame title={props.title} headingLevel={2}>
      <p className="block-empty">{props.text}</p>
    </HudFrame>
  );
}
