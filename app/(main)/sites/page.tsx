import { redirect } from "next/navigation";

/** The shell links here (design §4); TICKET-036 builds the list at this route. */
export default function SitesPage() {
  redirect("/dashboard");
}
