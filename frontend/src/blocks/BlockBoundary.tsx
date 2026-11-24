import { Component, type ReactNode } from "react";
import { Unsupported } from "./BlockRenderer";

// A block whose fields break its component must not unmount its siblings.
export class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Unsupported /> : this.props.children;
  }
}
