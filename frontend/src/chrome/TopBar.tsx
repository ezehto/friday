import type { VoiceLevelSource } from "../transport/types";
import { Fragment, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatTime } from "../lib/format";
import { toHash, useRoute, type View } from "../router";
import type { AppState } from "../store";
import { Core } from "./Core";
import { FIXED } from "./fixedText";
import { MotionSetting } from "./MotionSetting";
import { Tray } from "./Tray";

const VIEWS: readonly View[] = ["board", "approvals", "traces", "sessions", "permissions", "style-guide"];

/** A button with a small panel under it. Escape closes it and returns focus to the button. */
function Popover(props: { label: string; button: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || !open) return;
    setOpen(false);
    button.current?.focus();
  };
  return (
    <div className="pop" onKeyDown={onKeyDown}>
      <button ref={button} type="button" className="topbar-btn" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        <span className="visually-hidden">{props.label}</span>{" "}
        {props.button}
      </button>
      {open && <div id={id} className="pop-panel">{props.children}</div>}
    </div>
  );
}

const Bell = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="bell-icon">
    <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" />
  </svg>
);
const Gear = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="bell-icon">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </svg>
);

export function TopBar(props: { state: AppState; nowMs: number; timeZone?: string; onNavigate(v: View): void; headingLevel?: 1 | 4; open?: "tray" | "settings"; level?: VoiceLevelSource }) {
  const { state, level } = props;
  const route = useRoute();
  const Title = props.headingLevel === 4 ? "h4" : "h1";
  const iso = new Date(props.nowMs).toISOString();
  const counts = [
    [FIXED.chrome.approvals, state.approvals.length],
    [FIXED.chrome.permissions, state.permissions.length],
  ] as const;
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Title className="topbar-name">Friday</Title>
        <p className="topbar-tagline">{FIXED.tagline}</p>
      </div>
      <nav className="topbar-nav" aria-label={FIXED.chrome.navLabel}>
        {VIEWS.map((v) => (
          <a
            key={v}
            className="topbar-link label"
            href={toHash({ ...route, view: v })}
            aria-current={route.view === v ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              props.onNavigate(v);
            }}
          >
            {FIXED.chrome.views[v]}
          </a>
        ))}
      </nav>
      <div className="topbar-right">
        <span className="topbar-status label">
          <span className="status-dot" aria-hidden="true" />
          {FIXED.previewStatus}
        </span>
        <span className="topbar-clock">
          <span className="visually-hidden">{FIXED.chrome.clock} </span>
          <time dateTime={iso}>{formatTime(iso, props.timeZone)}</time>
        </span>
        <Popover
          label={FIXED.chrome.bell}
          defaultOpen={props.open === "tray"}
          button={
            <>
              <Bell />
              {counts.map(([name, n]) =>
                n > 0 ? (
                  <Fragment key={name}>
                    <span className="bell-count label">{name} {n}</span>{" "}
                  </Fragment>
                ) : null,
              )}
            </>
          }
        >
          <Tray items={state.tray} />
        </Popover>
        <Popover label={FIXED.chrome.settings} defaultOpen={props.open === "settings"} button={<Gear />}>
          <MotionSetting />
        </Popover>
        <span className="topbar-user label">{FIXED.chrome.userChip}</span>
        <Core state={state.core} size="compact" level={level} />
      </div>
    </header>
  );
}
