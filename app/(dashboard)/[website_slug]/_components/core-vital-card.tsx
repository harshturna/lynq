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

import { coreVitalDetails } from "@/constants";
import { calculateCoreVitalScore, cn } from "@/lib/utils";
import { ArrowUpRight, BadgeInfo } from "lucide-react";
import React from "react";

interface CoreVitalCardProps {
  type: CoreVitalType;
  score: number;
}

const CoreVitalCard = ({ type, score }: CoreVitalCardProps) => {
  const vitalDetails = coreVitalDetails[type];
  const scoreDetails = calculateCoreVitalScore(score, type);

  return (
    <div className="relative min-w-full sm:min-w-[350px] md:min-w-[450px]">
      <Card>
        <CardHeader className="mb-6 flex justify-between flex-row">
          <div>
            <CardTitle className="text-xl md:text-2xl">
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
                    <div className="my-2 text-white font-bold flex items-center gap-1">
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
          <div className="font-extrabold text-4xl mb-2">
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
