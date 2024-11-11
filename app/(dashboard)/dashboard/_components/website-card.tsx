"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRound } from "lucide-react";
import Link from "next/link";
import React from "react";
import Settings from "./settings";
import BottomGradient from "@/components/bottom-gradient";

interface WebsiteCardProps {
  website: Website;
}

const WebsiteCard = ({ website }: WebsiteCardProps) => {
  return (
    <div className="relative min-w-full sm:min-w-[350px] md:min-w-[350px]">
      <Link href={`/${website.slug}`} className="group/card">
        <Card>
          <CardHeader className="mb-4">
            <div>
              <CardTitle className="text-xl md:text-2xl">
                {website.name}
              </CardTitle>
              <CardDescription>{website.url}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-cyan-500/80 flex items-center gap-2 font-extrabold">
            <UserRound />
            <span>{website.visitors} Visitors</span>
          </CardContent>
        </Card>
        <BottomGradient />
      </Link>
      <Settings website={website} />
    </div>
  );
};

export default WebsiteCard;
