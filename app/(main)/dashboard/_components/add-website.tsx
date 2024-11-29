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
  AlertDialogTrigger,
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
import { PlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { addWebsite } from "@/lib/actions";
import { getUser } from "@/lib/user/client";
import { containsInvalidCharacters } from "@/lib/utils";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Website display name is required",
  }),
  url: z.string().min(1, {
    message: "Website URL is required",
  }),
});

const AddWebsite = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      url: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError("");

    if (
      values.url.startsWith("https://") ||
      values.url.startsWith("http://") ||
      values.url.includes("/") ||
      !values.url.includes(".") ||
      containsInvalidCharacters(values.url)
    ) {
      setError("Only add the domain name, e.g. example.com");
      return;
    }

    setLoading(true);

    const user = await getUser();
    if (!user || !user.id) {
      setError("Your session has expired");
      setLoading(false);
      return;
    }

    const response = await addWebsite(values.name, values.url, user.id);

    setLoading(false);

    if (typeof response === "string") {
      setError(response);
      return;
    }

    if (response && response.error) {
      // Conflict if website already exists
      if (response.status === 409 && response.error.code === "23505")
        setError("This website is already being tracked by lynq");
      else {
        setError("Server error when adding website, please try again");
      }
      return;
    }

    setOpen(false);
    router.refresh();
  };

  useEffect(() => {
    setError("");
    form.reset();
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogTrigger asChild>
        <Button className="px-4 py-5" onClick={() => setOpen(true)}>
          <div className="flex items-center text-xs md:text-sm">
            <PlusIcon width={15} height={15} />
            <span>Add Website</span>
          </div>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add new website</AlertDialogTitle>
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
            </div>
            <div className="mb-4">
              <FormField
                name="url"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="clair.byharsh.com" {...field} />
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
                {loading ? "Adding Website..." : "Add Website"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AddWebsite;
