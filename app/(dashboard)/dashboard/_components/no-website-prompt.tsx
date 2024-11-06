import { Button } from "@/components/ui/button";
import React from "react";
import AddWebsite from "./add-website";

const NoWebsitePrompt = () => {
  return (
    <div className="w-full h-[55vh] flex items-center justify-center flex-col border border-dashed border-stone-800 rounded-md border-spacing-5">
      <h2 className="text-2xl md:text-4xl">
        You are not tracking any websites!
      </h2>
      <p className="mb-4">Start by adding a new website</p>
      <AddWebsite />
    </div>
  );
};

export default NoWebsitePrompt;
