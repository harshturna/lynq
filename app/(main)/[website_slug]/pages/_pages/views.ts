/** The Pages screen's segmented caption, shared by both table components. */
import type { ViewOption } from "@/components/shell/data-table";

export const PAGE_VIEWS: ViewOption[] = [
  { key: "all", label: "All" },
  { key: "entry", label: "Entry" },
  { key: "exit", label: "Exit" },
  { key: "attention", label: "Attention" },
];
