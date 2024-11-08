"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import UpdateWebsite from "./update-website";
import DeleteWebsite from "./delete-website";

interface SettingsProps {
  website: Website;
}

const Settings = ({ website }: SettingsProps) => {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Ellipsis className="hover:text-stone-100 text-stone-400 transition duration-500 absolute top-7 right-5 cursor-pointer" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem
            className="p-3 cursor-pointer"
            onClick={() => setUpdateDialogOpen(true)}
          >
            <Pencil width={15} height={15} />
            Edit Website
          </DropdownMenuItem>
          <DropdownMenuItem
            className="p-3 cursor-pointer"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 width={15} height={15} />
            Delete Website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <UpdateWebsite
        website={website}
        open={updateDialogOpen}
        setOpen={setUpdateDialogOpen}
      />
      <DeleteWebsite
        website={website}
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
      />
    </>
  );
};

export default Settings;
