import { useRoute } from "./router";
import { StyleGuide } from "./views/StyleGuide";

export function App() {
  const route = useRoute();
  if (route.view === "style-guide") return <StyleGuide />;
  return (
    <main>
      <h1>Friday</h1>
    </main>
  );
}
