"use client";

import { Hint } from "@/components/hint";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn, copyContent } from "@/lib/utils";
import { Check, Copy, X } from "lucide-react";
import { Fira_Code } from "next/font/google";
import { useEffect, useState } from "react";

const firaCode = Fira_Code({ subsets: ["latin"] });

const SetupDialog = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [isCopy, setIsCopy] = useState(false);

  const copyContentHandler = () => {
    copyContent("test");
    setIsCopy(true);
    setTimeout(() => {
      setIsCopy(false);
    }, 1500);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return;

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent className="min-w-[300px] max-w-[600px] w-full">
        <AlertDialogHeader className="flex flex-row justify-between gap-20 mb-6">
          <div>
            <AlertDialogTitle className="font-light">
              Add the script to your HTML
            </AlertDialogTitle>
            <AlertDialogDescription>
              {
                "Add the script tag to the `<head>` of your HTML file for us to start tracking your website"
              }
            </AlertDialogDescription>
          </div>
          <AlertDialogCancel className="!mt-0">
            <X />
          </AlertDialogCancel>
        </AlertDialogHeader>
        <Hint label="Copy">
          <code
            onClick={copyContentHandler}
            className={cn(
              "text-sm bg-stone-900/80 p-4  rounded-md flex gap-10 justify-between cursor-pointer",
              firaCode.className
            )}
          >
            <div className="cursor-pointer">
              <span className="text-gray-500">{`<`}</span>
              <span className="text-[rgb(244_114_182)]">{`script`}</span>
              <br />
              <span className="text-slate-300 ml-6">{` src`}</span>
              <span className="text-[rgb(125_211_252)]">{`=`}</span>
              <span className="text-[rgb(125_211_252)]">
                {`https://data.jsdelivr.com/v1/packages/"`}
              </span>
              <br />
              <span className="text-slate-300 ml-6">{` data-id`}</span>
              <span className="text-[rgb(125_211_252)]">{`=`}</span>
              <span className="text-[rgb(125_211_252)]">{`"clair-byharsh-com"`}</span>
              <span className="text-gray-500">{`>`}</span>
              <br />
              <span className="text-gray-500">{`</`}</span>
              <span className="text-[rgb(244_114_182)]">{`script`}</span>
              <span className="text-gray-500">{`>`}</span>
            </div>
            <Button variant="secondary" size="icon">
              {isCopy ? (
                <Check width={10} height={10} />
              ) : (
                <Copy width={10} height={10} />
              )}
            </Button>
          </code>
        </Hint>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SetupDialog;
