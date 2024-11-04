"use client";
import { useFormState } from "react-dom";
import { login } from "../actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const initialState = {
  error: null,
  success: false,
};

function Login() {
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
    <div className="h-screen w-screen relative bg-black/80 flex justify-center items-center">
      <div className="z-10 max-w-sm md:max-w-lg lg:max-w-xl w-full mx-auto rounded-md p-4 md:p-8 shadow-input">
        <Link className="block" href="/">
          <img
            src="/assets/logo.png"
            alt="Lynq Logo"
            width={120}
            height={300}
            className="mx-auto"
          />
        </Link>
        <div className="relative mt-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="text-muted-foreground text-center uppercase bg-black px-2">
              Login
            </span>
          </div>
        </div>

        <form className="mt-8 mb-2">
          <LabelInputContainer className="mb-4">
            <Label htmlFor="email">Email Address</Label>
            <Input
              required
              id="email"
              name="email"
              placeholder="user@lynx.byharsh.com"
              type="email"
              className="border-gray-900"
            />
          </LabelInputContainer>
          <LabelInputContainer className="mb-4">
            <Label htmlFor="password">Password</Label>
            <Input
              required
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              className="border-gray-900"
            />
          </LabelInputContainer>

          <button
            className="bg-gradient-to-br relative group/btn  from-stone-900/10 to-zinc-900/90  block bg-stone-800/10 w-full text-white rounded-md h-10 font-medium  shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] mb-4"
            type="submit"
            formAction={loginAction}
          >
            Login &rarr;
            <BottomGradient />
          </button>
          <div className="text-white text-center">
            <span className="text-muted-foreground">
              Don&apos;t have an account?{" "}
            </span>
            <Link href="/sign-up" className="underline">
              Sign Up
            </Link>
            <div className="bg-gradient-to-r from-transparent via-neutral-800 dark:via-neutral-700 to-transparent my-6 h-[1px] w-full" />
          </div>
        </form>
        <div>
          <Button
            variant="ghost"
            className="w-full hover:bg-stone-900/60"
            onClick={handleGuestLogin}
          >
            Explore app as guest &rarr;
          </Button>
        </div>
        <div className="mt-4 text-red-900 text-center">
          {loginState?.error && <p>* {loginState?.error}</p>}
        </div>
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full text-white", className)}>
      {children}
    </div>
  );
};

export default Login;
