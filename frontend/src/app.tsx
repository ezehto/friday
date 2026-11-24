import { useEffect, useLayoutEffect, useState } from "react";
import { BASE_VIEWS, loadScenarios } from "./mocks";
import { toHash, useRoute, type Route, type View } from "./router";
import { createStore, initialState, useStore, type AppState } from "./store";
import { demoLevel, MockTransport } from "./transport/mock";
import type { SessionTransport, VoiceLevelSource } from "./transport/types";
import { Approvals } from "./views/Approvals";
import { Permissions } from "./views/Permissions";
import { Sessions } from "./views/Sessions";
import { Traces } from "./views/Traces";
import { Board } from "./views/Board";
import { ScenarioSwitcher } from "./views/ScenarioSwitcher";
import { StyleGuide } from "./views/StyleGuide";
import { Background } from "./chrome/Background";
import { ChatLine } from "./chrome/ChatLine";
import { FIXED } from "./chrome/fixedText";
import { TopBar } from "./chrome/TopBar";
import type { Scenario } from "./generated/types";

const SCENARIOS = loadScenarios();
const CLOCK_MS = 30_000;

type Store = ReturnType<typeof createStore>;
type Live = { id: string; runs: number; instant: boolean; store: Store; level: VoiceLevelSource };

// While push-to-talk is held the preview core listens, driven by this level. Never written to the store.
const PTT_LEVEL = demoLevel("listening");

const idleAct: SessionTransport["act"] = async () => ({ ok: false, preview: true, message: FIXED.previewResult });

type PageProps = {
  state: AppState;
  act: SessionTransport["act"];
  level?: VoiceLevelSource;
  now: string;
  nowMs: number;
  request: string | null;
  current: string;
  route: Route;
  onSelect(id: string): void;
  onRestart(): void;
  onNavigate(v: View): void;
};

function Page(props: PageProps) {
  const [talking, setTalking] = useState(false);
  const state: AppState = talking ? { ...props.state, core: "listening" } : props.state;
  const level = talking ? PTT_LEVEL : props.level;
  return (
    <>
      <Background />
      <div className="board-page">
        <TopBar state={state} nowMs={props.nowMs} onNavigate={props.onNavigate} level={level} />
        <ScenarioSwitcher scenarios={SCENARIOS} current={props.current} onSelect={props.onSelect} onRestart={props.onRestart} />
        {props.route.view === "approvals" ? (
          <Approvals state={state} act={props.act} />
        ) : props.route.view === "permissions" ? (
          <Permissions state={state} act={props.act} />
        ) : props.route.view === "sessions" ? (
          <Sessions state={state} act={props.act} />
        ) : props.route.view === "traces" ? (
          <Traces state={state} />
        ) : (
          <Board state={state} now={props.now} level={level} />
        )}
        <ChatLine state={state} request={props.request} onAct={props.act} level={level} onTalk={setTalking} />
      </div>
    </>
  );
}

// One page component for live and idle alike, so the board keeps its state across a scenario
// switch or restart and the old panels can fade out before the new ones enter.
const IDLE = { subscribe: () => () => undefined, getState: () => initialState };

function LivePage(props: Omit<PageProps, "state" | "act"> & { store: Store | null }) {
  const { store, ...rest } = props;
  const state = useStore(store ?? IDLE, (s) => s);
  useEffect(() => {
    if (state.done) document.body.dataset.scenarioDone = "true";
  }, [state.done]);
  return <Page {...rest} state={state} act={store ? store.act : idleAct} />;
}

export function App() {
  const route = useRoute();
  const scenario: Scenario | undefined = SCENARIOS.find((s) => s.id === route.scenario);
  const [runs, setRuns] = useState(0);
  const [live, setLive] = useState<Live | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, []);

  // Instant mode: CSS entry animations and the exit and glide scripts all key off this attribute.
  useLayoutEffect(() => {
    if (route.instant) document.documentElement.dataset.instant = "1";
    return () => void delete document.documentElement.dataset.instant;
  }, [route.instant]);

  const id = scenario?.id;
  const isGuide = route.view === "style-guide";
  useEffect(() => {
    if (isGuide || !scenario) return;
    const transport = new MockTransport(scenario, BASE_VIEWS, { instant: route.instant });
    const next = createStore(transport, transport);
    // The store owns a live transport, so it is created here and handed to state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive({ id: scenario.id, runs, instant: route.instant, store: next, level: transport });
    return () => {
      next.dispose();
      setLive(null);
      delete document.body.dataset.scenarioDone;
    };
    // scenario is found by id: depend on the id, not the object.
  }, [id, isGuide, route.instant, runs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isGuide) return <StyleGuide />;
  const shared = {
    nowMs,
    request: scenario?.request ?? null,
    current: id ?? "",
    route,
    onSelect: (next: string): void => void (window.location.hash = toHash({ ...route, scenario: next || null })),
    onRestart: (): void => setRuns((n) => n + 1),
    onNavigate: (view: View): void => void (window.location.hash = toHash({ ...route, view })),
  };
  // A disposed store from the previous scenario is never rendered: it must match the current route.
  const current = live && live.id === id && live.runs === runs && live.instant === route.instant ? live : null;
  return (
    <LivePage
      {...shared}
      now={current && scenario ? scenario.now : new Date(nowMs).toISOString()}
      store={current && scenario ? current.store : null}
      level={current && scenario ? current.level : undefined}
    />
  );
}
