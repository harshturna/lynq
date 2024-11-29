"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Getting Started",
      url: "#",
      items: [
        {
          title: "Installation",
          url: "/docs/#installation",
          isActive: false,
        },
      ],
    },
    {
      title: "Advance",
      url: "#",
      items: [
        {
          title: "Adding Typescript support",
          url: "/docs/#types",
          isActive: false,
        },
        {
          title: "First party proxy",
          url: "/docs/#proxy",
          isActive: false,
        },
        {
          title: "API",
          url: "/docs/#api",
          isActive: false,
        },
      ],
    },
  ],
};

export function DocsSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  // const hash = window?.location.hash;

  const fullPath = `${pathname}/`;

  return (
    <Sidebar {...props} className="mt-24">
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="text-muted-foreground font-semibold">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.url === fullPath ? true : false}
                      className={cn(item.isActive ? "bg-stone-900/10" : "")}
                    >
                      <Link
                        href={item.url}
                        className={cn(
                          "text-white/80",
                          item.isActive ? "bg-stone-900/10" : ""
                        )}
                      >
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
