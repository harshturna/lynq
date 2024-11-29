import React from "react";
import { DocsSidebar } from "./components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Docs = () => {
  return (
    <div className="mt-">
      <SidebarProvider>
        <DocsSidebar />
      </SidebarProvider>
    </div>
  );
};

export default Docs;
