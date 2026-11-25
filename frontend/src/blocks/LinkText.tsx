import type { ReactElement } from "react";
import type { Link } from "../generated/types";
import { safeLink } from "../lib/safety";

export function LinkText({ link }: { link: Link }): ReactElement {
  const safe = safeLink(link.url);
  if (!safe) return <>{link.text}</>;
  return (
    <a href={safe.href} target="_blank" rel="noopener noreferrer">
      {link.text} ({safe.host})
    </a>
  );
}
