import { Bone, TableSkeleton } from "@/components/shell/skeleton";

export default function BotsLoading() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-20" />
          <Bone className="h-4 w-80" />
        </div>
        <Bone className="h-8 w-40" />
      </div>
      <div className="flex flex-col gap-3">
        <Bone className="h-8 w-64" />
        <Bone className="h-3 w-full" />
        <Bone className="h-4 w-[70%]" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <TableSkeleton />
        <TableSkeleton />
      </div>
    </main>
  );
}
