import {
  Bone,
  ChartSkeleton,
  TableSkeleton,
} from "@/components/shell/skeleton";

export default function LocationsLoading() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-7 w-32" />
          <Bone className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-8 w-40" />
          <Bone className="h-8 w-28" />
          <Bone className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-3">
        <TableSkeleton />
        <TableSkeleton />
        <TableSkeleton />
      </div>
      <ChartSkeleton height={300} />
    </main>
  );
}
