"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteWebsite } from "@/lib/actions";
import { getUser } from "@/lib/user/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UpdateWebsiteProps {
  website: Website;
  open: boolean;
  setOpen: (arg: boolean) => void;
}

const DeleteWebsite = ({ website, open, setOpen }: UpdateWebsiteProps) => {
  const [error, setError] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function deleteHandler() {
    setError("");
    setLoading(true);
    const user = await getUser();
    if (!user || !user.id) {
      setError("Your session has expired");
      setLoading(false);
      return;
    }

    const response = await deleteWebsite(website.slug, user.id);

    setLoading(false);

    if (response && typeof response === "string") {
      setError(response);
      return;
    }

    if (response) {
      setError(response.message);
      return;
    }
    router.refresh();
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this website?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-normal">
            This action cannot be undone
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={deleteHandler}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
        {error && <p className="text-red-700 mt-2 mb-6 text-sm">{error}</p>}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteWebsite;
