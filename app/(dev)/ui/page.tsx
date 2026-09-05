import { notFound } from "next/navigation";
import { UiPreview } from "./preview";

/** Development-only preview of every shell component on sample data (TICKET-030, TICKET-031). */
export default function UiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiPreview />;
}
