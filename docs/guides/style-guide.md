# Friday style guide

The visual language of the dashboard (decision D18). Values live in
`frontend/src/styles/tokens.css`, the only file allowed to hold raw colours. The
live specimen is `#/style-guide` on the preview (port 8742). Dark theme only in the
MVP; every colour sits in one `:root` block so a light set can follow.

## Tokens

| Group | Names | Intent |
|---|---|---|
| Background | `--bg-canvas`, `--bg-panel`, `--bg-raised` | Warm near-black layers: page, panel, raised surface or disc. |
| Primary accent | `--accent-primary`, `-strong`, `-dim` | Saturated orange for strokes, ring arcs, kickers and large type. |
| Secondary accent | `--accent-secondary`, `-dim` | Muted teal-green for the secondary arc and the listening state. Speaking uses the primary orange. |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-accent` | Near-white values, softer body, quiet metadata, dark text on orange. |
| Lines and frames | `--line-grid`, `--line-blueprint`, `--line-panel-border`, `--line-corner-bracket` | Faint grey-brown linework: grid, blueprint lines, panel border, brackets. |
| Glow | `--glow-color`, `--glow-radius`, `--glow-strength` | One soft halo on frames and the core. |
| Tone | `--tone-good`, `--tone-bad`, `--tone-attention`, `--tone-neutral` and a `-bg` of each | See the tone mapping below. |
| Focus | `--focus-ring` | Light teal, 3:1 or better on canvas and panel. |
| Chart | `--series-1` to `--series-5` | Plain SVG chart series. |
| Typography | `--font-body`, `--font-label`, `--size-label`, `--size-body`, `--size-value`, `--tracking-label` | System stacks, nothing fetched. |
| Motion | `--motion-ring-duration`, `--motion-pulse-duration`, `--motion-panel-entry-duration`, `--motion-easing` | Each duration is `0s` under `prefers-reduced-motion` and `data-motion="reduced"`. |

Contrast is enforced by `frontend/tests/tokens.test.ts`: readable colours reach 4.5:1
on all three backgrounds, `--text-on-accent` 4.5:1 on `--accent-primary`,
`--focus-ring` 3:1 on canvas and panel, and `--tone-attention` sits at least 20
degrees of hue from `--accent-primary`.

## Tone mapping and icons

Tone is never colour alone: each tone has its own shape and a word, visible or
read by screen readers.

| Tone | Colour | Icon |
|---|---|---|
| good | teal-green | check |
| attention | amber-yellow | triangle |
| bad | red | cross |
| neutral | grey-brown | dot |

## Core states

The core and the status pill show only this fixed set, defined in
`frontend/src/chrome/fixedText.ts`.

| State | Disc | Pill |
|---|---|---|
| idle | READY | AWAITING COMMAND |
| listening | LISTENING | LISTENING |
| transcribing | TRANSCRIBING | TRANSCRIBING |
| thinking | THINKING | THINKING |
| running_tools | TOOLS | RUNNING TOOLS |
| speaking | SPEAKING | SPEAKING |
| awaiting_approval | APPROVAL | AWAITING APPROVAL |
| error | ERROR | ERROR |
| plan_limit | LIMIT | CLAUDE PLAN LIMIT REACHED |

## Labels

Uppercase, letter-spaced monospace (the `.label` class) is for labels and
headers only: panel headers, kickers, the core disc and pill. Body text and long
values never use it.

## Motion

Ring rotation and the disc pulse run only through the `--motion-*` tokens. The
"Reduce motion" setting and the operating-system preference both set them to `0s`.

## Voice level

While the core is listening or speaking, the core and the chat-line waveform
move with a voice level (0 to 1) written to `--voice-level` on their own root
element, never through React state. Listening draws inward in teal (rings
contract, a ripple travels toward the disc). Speaking radiates outward in orange
(pulses leave the disc edge and a halo grows). The waveform bars follow the same
level and take the same colour. The preview scripts the level from a
deterministic curve; real audio replaces the source later through
`VoiceLevelSource`. With "Reduce motion" or the operating-system preference,
nothing reads the level and the static core is shown. The Voice level section of
the style guide page shows both states.
