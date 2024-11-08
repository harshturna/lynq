import { LoaderCircle } from "lucide-react";

const Loading = () => {
  return (
    <main className="touch-none flex items-center justify-center absolute top-[50%] left-[50%] z-50">
      <LoaderCircle className="h-12 w-12 text-muted-foreground  animate-spin" />
    </main>
  );
};

export default Loading;
