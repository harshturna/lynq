const ThemeButton = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <button className="bg-gradient-to-br relative group/btn  from-stone-800/20 to-stone/800/40 to-stone-800/80  block bg-stone-800/20 w-full  rounded-md h-10 font-medium  shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] mb-4 px-6 text-muted-foreground text-sm">
      {children}
      <BottomGradient />
    </button>
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

export default ThemeButton;
