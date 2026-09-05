import Header from "@/components/header";
import { getUser } from "@/lib/user/server";

/** The sites list keeps the old header until TICKET-036 rebuilds it as /sites. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  return (
    <>
      <Header userEmail={user?.email || "Guest User"} />
      <div className="px-4 md:px-8 max-w-[1480px] mx-auto">{children}</div>
    </>
  );
}
