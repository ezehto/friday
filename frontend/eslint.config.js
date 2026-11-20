import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "node_modules", "src/generated"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Text-only rendering." },
        { selector: "MemberExpression[property.name=/^(innerHTML|outerHTML|insertAdjacentHTML)$/]", message: "Text-only rendering." },
        { selector: "NewExpression[callee.name='Function']", message: "No dynamic code." },
        { selector: "CallExpression[callee.name='eval']", message: "No dynamic code." },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "No network from the page." },
        { name: "XMLHttpRequest", message: "No network from the page." },
        { name: "WebSocket", message: "No network from the page." },
        { name: "EventSource", message: "No network from the page." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "navigator", property: "sendBeacon", message: "No network from the page." },
        { object: "navigator", property: "mediaDevices", message: "No media access." },
      ],
    },
  },
);
