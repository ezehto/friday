import type { Tone } from "../generated/types";

const SHAPES: Record<Tone, string> = {
  good: "M3 8.5 6.5 12 13 4.5",
  attention: "M8 2.5 14 13H2Z",
  bad: "M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5",
  neutral: "",
};

export function ToneIcon(props: { tone: Tone; showWord?: boolean }) {
  const { tone, showWord } = props;
  return (
    <span className={`tone-icon tone-${tone}`}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        {tone === "neutral" ? (
          <circle cx="8" cy="8" r="3.5" className="tone-fill" />
        ) : (
          <path d={SHAPES[tone]} className={tone === "attention" ? "tone-fill-soft" : "tone-stroke"} />
        )}
      </svg>
      <span className={showWord ? "tone-word" : "visually-hidden"}>{tone}</span>
    </span>
  );
}
