"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { signOut } from "@/lib/user/client";

export const MENU_CONTENT =
  "z-50 min-w-[200px] rounded-control border border-rule bg-canvas p-1 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]";
export const MENU_ITEM =
  "flex cursor-pointer select-none items-center rounded-chip px-2 py-[6px] text-[13px] text-ink-2 outline-none data-[highlighted]:bg-soft data-[highlighted]:text-ink";

/** The account avatar and its menu (design §4), shared by the site shell and the sites list. */
export function AccountMenu({
  userEmail,
  settingsHref,
}: {
  userEmail: string;
  settingsHref?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Account, ${userEmail}`}
          className="h-6 w-6 rounded-full bg-[linear-gradient(135deg,var(--teal),#0a0a0a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className={MENU_CONTENT}
        >
          <DropdownMenu.Label className="px-2 py-1 text-[12px] text-mute">
            {userEmail}
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild className={MENU_ITEM}>
            <Link href="/sites">All sites</Link>
          </DropdownMenu.Item>
          {settingsHref && (
            <DropdownMenu.Item asChild className={MENU_ITEM}>
              <Link href={settingsHref}>Site settings</Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Item
            className={MENU_ITEM}
            onSelect={async () => {
              const { error } = await signOut();
              if (!error) window.location.href = "/";
            }}
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
