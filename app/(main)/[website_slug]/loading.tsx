import { Skeleton } from "@/components/ui/skeleton";

const WebsiteLoading = () => {
  return (
    <main className="mb-4">
      {/* Nav tabs + date picker */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <Skeleton className="h-10 w-full md:w-[320px]" />
        <Skeleton className="h-[44px] w-[180px]" />
      </div>

      {/* Website name + configuration button */}
      <div className="my-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-800/60 p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <Skeleton className="h-[350px] w-full mb-8" />

      {/* Data panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </main>
  );
};

export default WebsiteLoading;
