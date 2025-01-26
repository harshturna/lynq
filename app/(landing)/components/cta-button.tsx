"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useFormState } from "react-dom";
import { login } from "@/app/(auth)/actions";
import { useRouter } from "next/navigation";

const initialState = {
  error: null,
  success: false,
};

const CtaButton = ({ styles }: { styles?: string }) => {
  const [loginState, loginAction] = useFormState(login, initialState);
  const router = useRouter();

  if (loginState.success) {
    router.push("/dashboard");
  }

  function handleGuestLogin() {
    const formData = new FormData();
    formData.append("email", "guest@email.com");
    formData.append("password", "guest@password");
    loginAction(formData);
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`py-4 px-4 md:py-4 md:px-6 font-poppins font-medium text-md md:text-lg text-primary bg-blue-gradient rounded-[10px] outline-none ${styles}`}
        >
          Get Started
        </button>
      </DialogTrigger>
      <DialogContent className="py-12">
        <DialogHeader>
          <DialogTitle>
            <div>
              <img
                src="/assets/logo.png"
                alt="Lynq Logo"
                width={120}
                height={300}
                className="mx-auto"
              />
            </div>
          </DialogTitle>
          <DialogDescription>
            <p className="font-medium text-white text-center text-xl mb-4 ml-6">
              Welcome to Lynq
            </p>
            <button
              className="bg-gradient-to-br relative group/btn  from-stone-900/10 to-zinc-900/90  block bg-stone-800/10 w-full text-white rounded-md h-10 font-medium  shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] mb-4 mt-8"
              onClick={handleGuestLogin}
            >
              Explore the app as guest &rarr;
              <BottomGradient />
            </button>
            <div className="bg-gradient-to-r from-transparent via-neutral-800 dark:via-neutral-700 to-transparent mt-8 h-[1px] w-full" />
            <p className="w-full mt-4 text-center">
              Have an account?{" "}
              <Link href="/login" className="text-white underline">
                Login
              </Link>
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
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
