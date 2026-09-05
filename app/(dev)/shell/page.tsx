import { notFound } from "next/navigation";
import { ShellPreview } from "./preview";

/**
 * Development-only preview of the shell (TICKET-030): the top navigation,
 * page header, range and compare pickers, chips and the filter builder on
 * sample props, driven by the real URL state. TICKET-031 adds the rest.
 */
export default function ShellPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ShellPreview />;
}
