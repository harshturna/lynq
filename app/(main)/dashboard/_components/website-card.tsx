"use client";

import { LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useTransition } from "react";
import BottomGradient from "@/components/bottom-gradient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Settings from "./settings";

interface WebsiteCardProps {
  website: Website;
  /** Unique visitors over the last 30 days */
  visitors: number;
}

const WebsiteCard = ({ website, visitors }: WebsiteCardProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Navigate through a transition so the card can show a pending state
  // immediately, instead of looking frozen while the RSC payload streams in
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab, etc.) behave natively
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    startTransition(() => {
      router.push(`/${website.slug}`);
    });
  };

  return (
    <div className="relative min-w-full sm:min-w-[350px] md:min-w-[350px]">
      <Link
        href={`/${website.slug}`}
        prefetch
        onClick={handleClick}
        aria-busy={isPending}
        className="group/card"
      >
        <Card
          className={isPending ? "opacity-60 transition-opacity" : undefined}
        >
          <CardHeader className="mb-8">
            {/* Keep this clear of the settings ellipsis, which is absolutely
                positioned at top-7 right-5 */}
            <div className="pr-8">
              <CardTitle className="text-xl md:text-2xl">
                {website.name}
              </CardTitle>
              <CardDescription>{website.url}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <div className="text-cyan-500/80 flex items-center gap-2 font-extrabold">
              <UserRound />
              <span>{visitors} Visitors</span>
              <span className="text-xs font-normal text-muted-foreground">
                last 30 days
              </span>
            </div>
            {isPending && (
              <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
            )}
          </CardContent>
        </Card>
        <BottomGradient />
      </Link>
      <Settings website={website} />
    </div>
  );
};

export default WebsiteCard;
