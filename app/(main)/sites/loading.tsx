import { Bone, TableSkeleton } from "@/components/shell/skeleton";

export default function SitesLoading() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="h-[54px] border-b border-rule-strong" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <Bone className="h-7 w-24" />
            <Bone className="h-4 w-56" />
          </div>
          <Bone className="h-8 w-28" />
        </div>
        <TableSkeleton rows={3} columns={4} />
      </main>
    </div>
  );
}
