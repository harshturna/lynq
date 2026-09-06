import { VISITOR_TOTAL_ATTR } from "./view-state";

/**
 * The visitor total the shell appends to filter announcements (design §6),
 * as a hidden data element the provider reads once a transition settles.
 * Rendered by the screens that have a summary; the others announce the
 * sentence and the filter count only.
 */
export function VisitorTotal({ value }: { value: number }) {
  return <data hidden value={value} {...{ [VISITOR_TOTAL_ATTR]: value }} />;
}
