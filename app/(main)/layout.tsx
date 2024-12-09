import Header from "@/components/header";
import { getUser } from "@/lib/user/server";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user || !user.id) {
    redirect("/login");
  }

  return (
    <>
      <Header userEmail={user.email || "Guest User"} />
      <div className="px-4 md:px-8 max-w-[1480px] mx-auto">{children}</div>
    </>
  );
}
