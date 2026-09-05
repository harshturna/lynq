"use client";
import { LoaderCircle } from "lucide-react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { login } from "@/app/(auth)/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getUser } from "@/lib/user/client";

const initialState = {
  error: null,
  success: false,
};

const CtaButton = ({ styles }: { styles?: string }) => {
  const [loginState, loginAction] = useFormState(login, initialState);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const isLoggedIn = async () => {
      try {
        const user = await getUser();
        if (user) {
          setIsLoggedIn(true);
          // Warm up the dashboard route so the redirect after login is fast
          router.prefetch("/sites");
        }
      } catch {
        setIsLoggedIn(false);
      }
    };
    isLoggedIn();
  }, [router]);

  useEffect(() => {
    if (loginState.success) {
      // Keep `loading` true — the button stays in its pending state until
      // the dashboard's loading skeleton takes over
      router.push("/sites");
    } else if (loginState.error) {
      setLoading(false);
    }
  }, [loginState, router]);

  function handleModal() {
    if (isLoggedIn) {
      router.push("/sites");
    } else {
      setOpen(true);
    }
  }

  function handleGuestLogin() {
    if (isLoggedIn) {
      router.push("/sites");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("email", "guest@email.com");
    formData.append("password", "guest@password");
    loginAction(formData);
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className={`py-4 px-4 md:py-4 md:px-6 font-poppins font-medium text-md md:text-lg text-primary bg-blue-gradient rounded-[10px] outline-none ${styles}`}
          onClick={handleModal}
        >
          Get Started
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent className="pt-4 pb-12">
        <div className="flex justify-end">
          <AlertDialogCancel onClick={() => setOpen(false)}>
            X
          </AlertDialogCancel>
        </div>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div>
              <img
                src="/assets/logo.png"
                alt="Lynq Logo"
                width={120}
                height={300}
                className="mx-auto"
              />
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="font-medium text-white text-center text-xl mb-4 ml-4">
              Welcome to Lynq
            </p>
            <button
              type="submit"
              className="bg-gradient-to-br relative group/btn from-stone-900/10 to-zinc-900/90 flex items-center justify-center gap-2 bg-stone-800/10 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] mb-4 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Setting up your demo...
                </>
              ) : (
                "Explore the app as guest"
              )}
              <BottomGradient />
            </button>
            {loginState.error ? (
              <p className="text-sm text-center text-red-600 my-2">
                Error when logging in as guest
              </p>
            ) : null}
            <div className="bg-gradient-to-r from-transparent via-neutral-800 dark:via-neutral-700 to-transparent mt-8 h-[1px] w-full" />
            <p className="w-full mt-4 text-center">
              Have an account?{" "}
              <Link href="/login" className="text-white underline">
                Login
              </Link>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

export default CtaButton;
