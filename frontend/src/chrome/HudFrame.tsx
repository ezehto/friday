import type { ReactNode } from "react";

type HeadingLevel = 2 | 3 | 4;

export function HudFrame(props: { title: string; kicker?: string; stamps?: ReactNode; headingLevel?: HeadingLevel; children: ReactNode }) {
  const Heading = `h${props.headingLevel ?? 2}` as const;
  return (
    <section className="hud-frame" aria-label={props.title}>
      <span className="hud-bracket hud-bracket-tl" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-tr" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-bl" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-br" aria-hidden="true" />
      <header className="hud-header">
        {props.kicker ? <span className="label hud-kicker">{props.kicker}</span> : null}
        <Heading className="label hud-title">{props.title}</Heading>
        {props.stamps ? <span className="label hud-stamps">{props.stamps}</span> : null}
      </header>
      <div className="hud-body">{props.children}</div>
    </section>
  );
}
