"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { updateWebsiteOne } from "@/lib/actions";
import { getUser } from "@/lib/user/client";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Website display name is required",
  }),
});

interface UpdateWebsiteProps {
  website: Website;
  open: boolean;
  setOpen: (arg: boolean) => void;
}

const UpdateWebsite = ({ website, open, setOpen }: UpdateWebsiteProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  console.log(website);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: website.name,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError("");

    setLoading(true);

    const user = await getUser();
    if (!user || !user.id) {
      setError("Your session has expired");
      setLoading(false);
      return;
    }

    const response = await updateWebsiteOne(
      website.slug,
      "name",
      values.name,
      user.id
    );

    setLoading(false);

    if (typeof response === "string") {
      setError(response);
      return;
    }

    if (response) {
      setError("Server error when updating website, please try again");
      return;
    }

    setOpen(false);
    router.refresh();
  };

  useEffect(() => {
    setError("");
    form.reset({
      name: website.name,
    });
  }, [open, website.name]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update website display name</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription className="hidden"></AlertDialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="mb-4">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder="Clair" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <p className="text-red-700 mt-2 mb-6 text-sm">{error}</p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating Website..." : "Update Website"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpdateWebsite;
