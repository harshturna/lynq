import { redirect } from "next/navigation";

/** The old list lived here; /sites is the route (design §4). Kept for bookmarks. */
export default function DashboardRedirect() {
  redirect("/sites");
}
