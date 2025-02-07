"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { signOut } from "@/lib/user/client";
import { usePathname } from "next/navigation";

const Header = ({ userEmail }: { userEmail: string }) => {
  const pathname = usePathname();
  const handleSignOut = async () => {
    const { error } = await signOut();

    if (!error) {
      window.location.href = "/";
    }
  };

  return (
    <div className="w-full px-4 md:px-10 mb-6 border-b border-stone-900/80 sticky top-0 bg-black z-50 bg-opacity-20 filter backdrop-blur-lg flex justify-between py-4 items-center">
      <Link href={pathname === "/dashboard" ? "/" : "/dashboard"}>
        <img src="/assets/logo.png" alt="Lynq Logo" width={120} height={300} />
      </Link>
      <div className="flex space-x-6">
        <DropdownMenu>
          <DropdownMenuTrigger className="text-muted-foreground outline-none p-0 m-0 border-none">
            <div className="flex space-x-2 items-center justify-center hover:text-white">
              <Avatar>
                <AvatarImage src="/assets/user-avatar.png" />
                <AvatarFallback></AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-[#0a0a0a] border-white/5 outline-none text-white px-2 min-w-44"
            sideOffset={10}
            alignOffset={10}
            align="end"
          >
            <DropdownMenuLabel className="mb-2 text-sm">
              {userEmail === "guest@email.com" ? "Guest User" : userEmail}
            </DropdownMenuLabel>

            <Link href="https://docs-lynq.byharsh.com" target="_blank">
              <DropdownMenuItem className="text-muted-foreground hover:text-white py-0 mb-2">
                <DropdownMenuLabel>Docs</DropdownMenuLabel>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="mx-1 bg-stone-900/80" />
            <DropdownMenuItem
              className="text-muted-foreground hover:text-white py-0"
              onClick={handleSignOut}
            >
              <DropdownMenuLabel>Logout</DropdownMenuLabel>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Header;
