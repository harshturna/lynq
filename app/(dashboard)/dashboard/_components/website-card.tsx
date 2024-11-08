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
            <span>{"10"} Visitors</span>
          </CardContent>
        </Card>
        <BottomGradient />
      </Link>
      <Settings website={website} />
    </div>
  );
};

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/card:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/card:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

export default WebsiteCard;
