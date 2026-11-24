import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { AppState } from "../store";
import type { SessionTransport, VoiceLevelSource } from "../transport/types";
import { useVoiceLevel } from "./Core";
import type { CoreState } from "./coreStates";
import { FIXED } from "./fixedText";

// Per-bar gain, so equal levels still read as a waveform.
const GAINS = [0.5, 0.8, 1, 0.7, 0.95, 0.6, 0.85] as const;

/** Hold with the pointer or Space. A visual only: no audio or media API is touched. */
export function PushToTalk(props: { pressed: boolean; onChange(pressed: boolean): void; level?: VoiceLevelSource; core?: CoreState }) {
  const { pressed, onChange } = props;
  const wave = useRef<HTMLSpanElement>(null);
  useVoiceLevel(wave, props.level, props.core === "listening" || props.core === "speaking");
  return (
    <div className="ptt">
      <button
        type="button"
        className="ptt-button"
        aria-pressed={pressed}
        onPointerDown={(e) => {
          if (e.button === 0) onChange(true);
        }}
        onPointerUp={() => onChange(false)}
        onPointerLeave={() => onChange(false)}
        onPointerCancel={() => onChange(false)}
        onBlur={() => onChange(false)}
        onKeyDown={(e) => {
          if (e.key !== " ") return;
          e.preventDefault();
          if (!e.repeat) onChange(true);
        }}
        onKeyUp={(e) => {
          if (e.key === " ") onChange(false);
        }}
      >
        {FIXED.chat.pushToTalk}
      </button>
      <span ref={wave} className="ptt-wave" data-core-state={props.core} aria-hidden="true">
        {GAINS.map((gain, i) => (
          <span key={i} className="ptt-bar" style={{ "--bar": i, "--gain": gain } as CSSProperties} />
        ))}
      </span>
      <span className="ptt-label label" aria-live="polite">
        {pressed ? FIXED.chat.listening : ""}
      </span>
    </div>
  );
}

export function ChatLine(props: { state: AppState; request: string | null; onAct: SessionTransport["act"]; defaultOpen?: boolean; initialResult?: string; level?: VoiceLevelSource; onTalk?(pressed: boolean): void }) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(props.initialResult ?? null);
  const drawerId = useId();
  const inputId = useId();
  const [talking, setTalking] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const { reply } = props.state;

  const talk = (pressed: boolean): void => {
    setTalking(pressed);
    props.onTalk?.(pressed);
  };
  const close = (): void => {
    talk(false);
    setOpen(false);
    toggle.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && open) close();
  };
  const submit = (e: { preventDefault(): void }): void => {
    e.preventDefault();
    const message = text.trim();
    if (!message) return setResult(FIXED.chat.emptyHint);
    setText("");
    // Preview only: whatever the transport does, the owner sees the preview status.
    void props
      .onAct({ kind: "send_message", text: message })
      .then((r) => setResult(r.message))
      .catch(() => setResult(FIXED.previewResult));
  };

  return (
    <div className="chat" onKeyDown={onKeyDown}>
      <button ref={toggle} type="button" className="chat-toggle label" aria-expanded={open} aria-controls={open ? drawerId : undefined} onClick={() => (open ? close() : setOpen(true))}>
        {open ? FIXED.chat.close : FIXED.chat.open}
      </button>
      {open && (
        <section id={drawerId} className="chat-drawer" aria-label={FIXED.chat.region}>
          <div className="chat-log">
            <p className="chat-line">
              <span className="label chat-who">{FIXED.chat.request}</span>
              {props.request ?? <span className="chat-none">{FIXED.chat.noRequest}</span>}
            </p>
            {reply && (
              <p className="chat-line">
                <span className="label chat-who">{FIXED.chat.reply}</span>
                {reply.text}
              </p>
            )}
          </div>
          <form className="chat-form" onSubmit={submit}>
            <label className="visually-hidden" htmlFor={inputId}>{FIXED.chat.input}</label>
            <input id={inputId} className="chat-input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
            <button type="submit" className="chat-btn label">{FIXED.chat.send}</button>
            <button type="button" className="chat-btn label" onClick={() => setResult(FIXED.previewResult)}>{FIXED.chat.new}</button>
          </form>
          <PushToTalk pressed={talking} onChange={talk} level={props.level} core={props.state.core} />
          <p className="chat-result" role="status">{result}</p>
        </section>
      )}
    </div>
  );
}
