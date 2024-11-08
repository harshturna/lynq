import Header from "@/components/header";
import { Suspense } from "react";
import Loading from "./loading";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 md:px-8 max-w-[1480px] mx-auto">
      <Header />
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </div>
  );
}
