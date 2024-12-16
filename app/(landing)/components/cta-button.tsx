import Link from "next/link";

const CtaButton = ({ styles }: { styles?: string }) => (
  <Link href="/dashboard" className="z-10">
    <button
      type="button"
      className={`py-4 px-4 md:py-4 md:px-6 font-poppins font-medium text-md md:text-lg text-primary bg-blue-gradient rounded-[10px] outline-none ${styles}`}
    >
      Get Started
    </button>
  </Link>
);

export default CtaButton;
