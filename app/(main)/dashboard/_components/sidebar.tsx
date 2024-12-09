"use client";

import { Button } from "@/components/ui/button";
import { sidePanelItems } from "@/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Sidebar = () => {
  const pathname = usePathname();
  return (
    <div className="hidden md:flex md:flex-col w-[200px] gap-4">
      {sidePanelItems.map((item) => (
        <Link
          href={item.href}
          key={item.href}
          className="block w-full"
          target={item.isExternal ? "_blank" : undefined}
        >
          <Button
            className={cn(
              "flex justify-start text-sm items-center gap-2 w-full hover:bg-zinc-900/80",
              pathname === item.href ? "bg-zinc-900" : ""
            )}
            variant="ghost"
          >
            <item.icon width={15} height={15} />
            <span>{item.title}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default Sidebar;
