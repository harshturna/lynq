"use client";

import { Check, Copy, X } from "lucide-react";
import { Fira_Code } from "next/font/google";
import { useEffect, useState } from "react";
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
  // The tracker is served first-party from this deployment (design §7); the
  // origin is read after mount so the snippet matches wherever Lynq is hosted.
  const lynqScriptSrc = `${
    typeof window === "undefined" ? "" : window.location.origin
  }/js/lynq.js`;

  const constructedScript = `<script defer src="${lynqScriptSrc}" data-site="${siteUrl}"></script>`;

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
                "Add this snippet to the `<head>` of your site. Add data-vitals, data-outbound or data-auto-events to the tag to turn those features on."
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
              <span className="text-gray-500">{`<`}</span>
              <span className="text-[rgb(244_114_182)]">{`script`}</span>
              <br />
              <span className="text-slate-300 ml-6">{` defer`}</span>
              <br />
              <span className="text-slate-300 ml-6">{` src`}</span>
              <span className="text-[rgb(125_211_252)]">{`=`}</span>
              <span className="text-[rgb(125_211_252)]">
                {`"${lynqScriptSrc}"`}
              </span>
              <br />
              <span className="text-slate-300 ml-6">{` data-site`}</span>
              <span className="text-[rgb(125_211_252)]">{`=`}</span>
              <span className="text-[rgb(125_211_252)]">{`"${siteUrl}"`}</span>
              <span className="text-gray-500">{`>`}</span>
              <br />
              <span className="text-gray-500">{`</`}</span>
              <span className="text-[rgb(244_114_182)]">{`script`}</span>
              <span className="text-gray-500">{`>`}</span>
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
