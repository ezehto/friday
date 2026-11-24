import { useEffect, useState } from "react";
import { BASE_VIEWS, loadScenarios } from "./mocks";
import { toHash, useRoute, type Route, type View } from "./router";
import { createStore, initialState, useStore, type AppState } from "./store";
import { MockTransport } from "./transport/mock";
import type { SessionTransport } from "./transport/types";
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
type Live = { id: string; runs: number; instant: boolean; store: Store };

const idleAct: SessionTransport["act"] = async () => ({ ok: false, preview: true, message: FIXED.previewResult });

type PageProps = {
  state: AppState;
  act: SessionTransport["act"];
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
  return (
    <>
      <Background />
      <div className="board-page">
        <TopBar state={props.state} nowMs={props.nowMs} onNavigate={props.onNavigate} />
        <ScenarioSwitcher scenarios={SCENARIOS} current={props.current} onSelect={props.onSelect} onRestart={props.onRestart} />
        <Board state={props.state} now={props.now} />
        <ChatLine state={props.state} request={props.request} onAct={props.act} />
      </div>
    </>
  );
}

function LivePage(props: Omit<PageProps, "state" | "act"> & { store: Store }) {
  const { store, ...rest } = props;
  const state = useStore(store, (s) => s);
  useEffect(() => {
    if (state.done) document.body.dataset.scenarioDone = "true";
  }, [state.done]);
  return <Page {...rest} state={state} act={store.act} />;
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

  const id = scenario?.id;
  const isGuide = route.view === "style-guide";
  useEffect(() => {
    if (isGuide || !scenario) return;
    const transport = new MockTransport(scenario, BASE_VIEWS, { instant: route.instant });
    const next = createStore(transport, transport);
    // The store owns a live transport, so it is created here and handed to state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive({ id: scenario.id, runs, instant: route.instant, store: next });
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
  return current && scenario ? (
    <LivePage {...shared} now={scenario.now} store={current.store} />
  ) : (
    <Page {...shared} now={new Date(nowMs).toISOString()} state={initialState} act={idleAct} />
  );
}
