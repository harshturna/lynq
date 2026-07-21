import { Skeleton } from "@/components/ui/skeleton";

const DashboardLoading = () => {
  return (
    <div className="items-center justify-center flex flex-col">
      <div className="w-full flex my-8 gap-16">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col gap-4 min-w-[200px]">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="w-full items-start justify-start flex flex-col">
          <div className="w-full flex justify-between items-center">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-56" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Website cards */}
          <div className="flex flex-wrap w-full gap-10 my-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="min-w-full sm:min-w-[350px] md:min-w-[350px] rounded-xl border border-stone-800/60 p-6"
              >
                <Skeleton className="h-7 w-40 mb-2" />
                <Skeleton className="h-4 w-52 mb-10" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLoading;
