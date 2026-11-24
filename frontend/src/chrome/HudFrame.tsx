import type { ReactNode } from "react";

export function HudFrame(props: { title: string; kicker?: string; stamps?: ReactNode; children: ReactNode }) {
  return (
    <section className="hud-frame" aria-label={props.title}>
      <span className="hud-bracket hud-bracket-tl" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-tr" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-bl" aria-hidden="true" />
      <span className="hud-bracket hud-bracket-br" aria-hidden="true" />
      <header className="hud-header">
        {props.kicker ? <span className="label hud-kicker">{props.kicker}</span> : null}
        <h2 className="label hud-title">{props.title}</h2>
        {props.stamps ? <span className="label hud-stamps">{props.stamps}</span> : null}
      </header>
      <div className="hud-body">{props.children}</div>
    </section>
  );
}
