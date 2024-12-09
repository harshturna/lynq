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

const SetupDialog = ({
  title,
  siteUrl,
  open,
  setClose,
}: {
  title: string;
  siteUrl: string;
  open: boolean;
  setClose: () => void;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isCopy, setIsCopy] = useState(false);
  const lynqScriptVersion = process.env.NEXT_PUBLIC_LYNQ_SCRIPT_VERSION;
  const lynqScriptSrc = `https://cdn.jsdelivr.net/gh/harshturna/lynq-js${
    lynqScriptVersion || ""
  }/dist/lynq.min.js`;
  const stubScript = `!function(){"use strict";window.lynq=window.lynq||{track:function(n,e){(window.lynqQueue=window.lynqQueue||[]).push({name:n,properties:e,eventId:crypto.randomUUID()})}}}();`;

  const constructedScript = `<script>${stubScript}</script>\n<script async src="${lynqScriptSrc}" data-domain="${siteUrl}" data-script-id="lynq"></script>`;

  const copyContentHandler = () => {
    copyContent(constructedScript);
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
    <AlertDialog open={open}>
      <AlertDialogContent className="min-w-[300px] max-w-[900px] w-full">
        <AlertDialogHeader className="flex flex-row justify-between gap-20 mb-6">
          <div>
            <AlertDialogTitle className="font-light">{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {
                "Add the following snippet to the `<head>` of your HTML file for us to start tracking your website"
              }
            </AlertDialogDescription>
          </div>
          <AlertDialogCancel className="!mt-0" onClick={() => setClose()}>
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
              <div>
                <span className="text-gray-500">{`<`}</span>
                <span className="text-[rgb(244_114_182)]">{`script`}</span>
                <span className="text-gray-500">{`>`}</span>
                <br />
                <span>{stubScript}</span>
                <br />
                <span className="text-gray-500">{`</`}</span>
                <span className="text-[rgb(244_114_182)]">{`script`}</span>
                <span className="text-gray-500">{`>`}</span>
              </div>
              <div>
                <span className="text-gray-500">{`<`}</span>
                <span className="text-[rgb(244_114_182)]">{`script`}</span>
                <br />
                <span className="text-slate-300 ml-6">{` async`}</span>
                <br />
                <span className="text-slate-300 ml-6">{` src`}</span>
                <span className="text-[rgb(125_211_252)]">{`=`}</span>
                <span className="text-[rgb(125_211_252)]">
                  {`"${lynqScriptSrc}"`}
                </span>
                <br />
                <span className="text-slate-300 ml-6">{` data-script-id`}</span>
                <span className="text-[rgb(125_211_252)]">{`=`}</span>
                <span className="text-[rgb(125_211_252)]">{`"lynq"`}</span>
                <br />
                <span className="text-slate-300 ml-6">{` data-domain`}</span>
                <span className="text-[rgb(125_211_252)]">{`=`}</span>
                <span className="text-[rgb(125_211_252)]">{`"${siteUrl}"`}</span>
                <span className="text-gray-500">{`>`}</span>
                <br />
                <span className="text-gray-500">{`</`}</span>
                <span className="text-[rgb(244_114_182)]">{`script`}</span>
                <span className="text-gray-500">{`>`}</span>
              </div>
            </div>
            <Button variant="link" size="icon">
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
