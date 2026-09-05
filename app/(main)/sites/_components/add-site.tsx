"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addWebsite } from "@/lib/actions";
import { containsInvalidCharacters } from "@/lib/utils";

/** Name and hostname, then straight to the site, whose Overview shows the snippet until data arrives. */
export function AddSite({
  userId,
  isGuest,
  openOnLoad,
}: {
  userId: string;
  isGuest: boolean;
  openOnLoad?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(openOnLoad));
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      setError("");
      const host = url.trim().toLowerCase();
      if (
        host.startsWith("http") ||
        host.includes("/") ||
        !host.includes(".") ||
        containsInvalidCharacters(host)
      )
        return setError("Only the hostname, e.g. example.com");
      const res = await addWebsite(name.trim(), host, userId);
      if (typeof res === "string") return setError(res);
      if (res.error)
        return setError(
          res.status === 409 || res.error.code === "23505"
            ? "This site is already tracked by Lynq."
            : "Couldn't add the site."
        );
      setOpen(false);
      router.push(`/${host.replaceAll(".", "-")}`);
    });
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-[30px] items-center gap-2 rounded-control border border-teal bg-teal px-[10px] text-[13px] font-medium leading-none text-canvas transition-colors hover:bg-teal-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          + Add a site
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[300px] rounded-control border border-rule bg-canvas p-4 text-[13px] shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]"
        >
          {isGuest ? (
            <p className="text-mute">The guest account cannot add sites.</p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aivia"
                  required
                  className="h-8 rounded-control border border-rule px-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-mute">Hostname</span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="aivia.byharsh.com"
                  required
                  className="h-8 rounded-control border border-rule px-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
                />
              </label>
              {error && <p className="text-[12px] text-poor">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pending}
                  className="h-8 rounded-control bg-teal px-3 text-[13px] font-medium text-canvas disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Add site"}
                </button>
              </div>
            </form>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
