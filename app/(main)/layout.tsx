import { redirect } from "next/navigation";
import { getUser } from "@/lib/user/server";

/** Signed-in routes. Each section brings its own chrome (design §4). */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user || !user.id) redirect("/login");
  return <>{children}</>;
}
