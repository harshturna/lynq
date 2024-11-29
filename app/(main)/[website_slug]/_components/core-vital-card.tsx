import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { webVitalDetails } from "@/constants";
import { calculateWebVitalScore, cn } from "@/lib/utils";
import { ArrowUpRight, BadgeInfo } from "lucide-react";
import React from "react";

interface CoreVitalCardProps {
  type: WebVitalType;
  score: number;
  isCore?: boolean;
}

const CoreVitalCard = ({ type, score, isCore = false }: CoreVitalCardProps) => {
  const vitalDetails = webVitalDetails[type];
  const scoreDetails = calculateWebVitalScore(score, type);

  return (
    <div className={cn("relative")}>
      <Card className={cn(isCore ? "" : "border-none bg-transparent")}>
        <CardHeader className="mb-6 flex justify-between flex-row">
          <div>
            <CardTitle className="text-lg md:text-xl lg:text-2xl">
              {vitalDetails.type}
            </CardTitle>
            <CardDescription>{vitalDetails.name}</CardDescription>
          </div>
          <div>
            <Dialog>
              <DialogTrigger>
                <BadgeInfo />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{vitalDetails.type}</DialogTitle>
                  <DialogDescription>
                    {vitalDetails.description}
                    <div className="my-2 text-white font-bold flex items-center gap-1 justify-end">
                      <a href={vitalDetails.link} target="_blank">
                        Learn more
                      </a>
                      <ArrowUpRight width={16} height={16} />
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            scoreDetails.range === "Good"
              ? "text-green-400"
              : scoreDetails.range === "Need improvement"
              ? "text-yellow-500"
              : scoreDetails.range === "Poor"
              ? "text-red-600"
              : "text-muted-foreground"
          )}
        >
          <div className="font-extrabold text-xl md:text-4xl mb-2">
            {scoreDetails.range === "Not enough data"
              ? "-"
              : scoreDetails.score}
          </div>
          <span>{scoreDetails.range}</span>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoreVitalCard;
