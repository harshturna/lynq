import BottomGradient from "@/components/bottom-gradient";
import { Hint } from "@/components/hint";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import React from "react";

interface DataCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  description: string;
}

const DataCard = ({ label, description, icon: Icon, value }: DataCardProps) => {
  return (
    <Hint label={description}>
      <div className="group/card relative">
        <Card className="w-[340px] py-2">
          <CardHeader>
            <div className="flex justify-between text-sm mb-2">
              {label}
              <Icon width={15} height={15} />
            </div>
          </CardHeader>
          <CardContent className="text-4xl text-cyan-500/80 font-bold">
            {value}
          </CardContent>
        </Card>
        <>
          <span className="absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></span>
        </>
      </div>
    </Hint>
  );
};

export default DataCard;
