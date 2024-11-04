"use client";
import { useFormState } from "react-dom";
import { signUp } from "../actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarsBackground } from "@/components/ui/stars-background";
import { ShootingStars } from "@/components/ui/shooting-stars";

const initialState = {
  error: null,
  success: false,
};

function SignUp() {
  const [signupState, signupAction] = useFormState(signUp, initialState);
  const router = useRouter();

  if (signupState.success) {
    router.push("/dashboard");
  }

  return (
    <div className="h-screen w-screen bg-black/80 flex justify-center items-center relative">
      <div className="max-w-sm md:max-w-lg lg:max-w-xl w-full mx-auto rounded-md p-4 md:p-8 shadow-input border border-gray-900 z-10 bg-stone-950/60">
        <h2 className="font-bold text-xl text-neutral-200">Welcome to Lynx</h2>
        <p className="text-sm max-w-sm mt-2 text-neutral-300">Sign up to ...</p>

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
            formAction={signupAction}
          >
            Sign up &rarr;
            <BottomGradient />
          </button>
          <div className="text-white text-center">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link href="/login" className="underline">
              Login
            </Link>
            <div className="bg-gradient-to-r from-transparent via-neutral-800 dark:via-neutral-700 to-transparent my-6 h-[1px] w-full" />
            <div className="mt-4 text-red-900 text-center">
              {signupState?.error && <p>* {signupState?.error}</p>}
            </div>
          </div>
        </form>
      </div>
      <ShootingStars />
      <StarsBackground starDensity={0.0001} />
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

export default SignUp;
