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
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/user/client";

const Header = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    const { error } = await signOut();

    // todo: show toast if error
    if (!error) {
      router.push("/");
    }
  };

  return (
    <div className="w-full mb-6 border-b border-stone-900/80 sticky top-0 bg-black z-50 bg-opacity-20 filter backdrop-blur-lg flex justify-between py-4 items-center">
      <img src="/assets/logo.png" alt="Lynq Logo" width={120} height={300} />
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
            <DropdownMenuLabel className="mb-2">Guest User</DropdownMenuLabel>

            <Link href="/settings" prefetch>
              <DropdownMenuItem className="text-muted-foreground hover:text-white py-0 mb-2">
                <DropdownMenuLabel>Api</DropdownMenuLabel>
              </DropdownMenuItem>
            </Link>
            <Link href="/settings" prefetch>
              <DropdownMenuItem className="text-muted-foreground hover:text-white py-0 mb-2">
                <DropdownMenuLabel>Docs</DropdownMenuLabel>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="mx-1 bg-stone-900/80" />
            <DropdownMenuItem className="text-muted-foreground hover:text-white py-0">
              <DropdownMenuLabel onClick={handleSignOut}>
                Logout
              </DropdownMenuLabel>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Header;
