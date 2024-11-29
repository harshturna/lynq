import Header from "@/components/header";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="px-4 md:px-8 max-w-[1480px] mx-auto">{children}</div>
    </>
  );
}
