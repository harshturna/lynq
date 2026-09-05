import { Bone } from "@/components/shell/skeleton";

export default function SettingsLoading() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-7 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-2">
        <Bone className="h-7 w-28" />
        <Bone className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bone key={i} className="h-6 w-32" />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <Bone className="h-24 w-full" />
          <Bone className="h-40 w-full" />
          <Bone className="h-24 w-full" />
        </div>
      </div>
    </main>
  );
}
