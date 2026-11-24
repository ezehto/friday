import { useEffect, useState } from "react";
import { BASE_VIEWS, loadScenarios } from "./mocks";
import { toHash, useRoute } from "./router";
import { createStore, initialState, useStore } from "./store";
import { MockTransport } from "./transport/mock";
import { Board } from "./views/Board";
import { ScenarioSwitcher } from "./views/ScenarioSwitcher";
import { StyleGuide } from "./views/StyleGuide";
import { Background } from "./chrome/Background";
import type { Scenario } from "./generated/types";

const SCENARIOS = loadScenarios();

type Store = ReturnType<typeof createStore>;

function LiveBoard(props: { store: Store; now: string }) {
  const state = useStore(props.store, (s) => s);
  useEffect(() => {
    if (state.done) document.body.dataset.scenarioDone = "true";
  }, [state.done]);
  return <Board state={state} now={props.now} />;
}

export function App() {
  const route = useRoute();
  const scenario: Scenario | undefined = SCENARIOS.find((s) => s.id === route.scenario);
  const [runs, setRuns] = useState(0);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    delete document.body.dataset.scenarioDone;
    if (!scenario) return;
    const transport = new MockTransport(scenario, BASE_VIEWS, { instant: route.instant });
    const next = createStore(transport, transport);
    // The store owns a live transport, so it is created here and handed to state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(next);
    return () => {
      next.dispose();
      setStore(null);
    };
    // scenario is found by id: depend on the id, not the object.
  }, [scenario?.id, route.instant, runs]); // eslint-disable-line react-hooks/exhaustive-deps

  if (route.view === "style-guide") return <StyleGuide />;
  const select = (id: string): void => void (window.location.hash = toHash({ ...route, scenario: id || null }));
  return (
    <>
      <Background />
      <div className="board-page">
        <h1 className="visually-hidden">Friday</h1>
        <ScenarioSwitcher scenarios={SCENARIOS} current={scenario?.id ?? ""} onSelect={select} onRestart={() => setRuns((n) => n + 1)} />
        {store && scenario ? (
          <LiveBoard store={store} now={scenario.now} />
        ) : (
          <Board state={initialState} now={new Date().toISOString()} />
        )}
      </div>
    </>
  );
}
