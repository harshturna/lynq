import CtaButton from "./cta-button";

const CTA = async () => {
  return (
    <section
      className={`flex justify-center items-center sm:my-16 my-6 sm:px-16 px-6 sm:py-12 py-4 sm:flex-row flex-col rounded-[20px]`}
    >
      <div className="flex-1 flex flex-col">
        <h2 className="font-semibold xs:text-[48px] text-[40px] text-white xs:leading-[76.8px] leading-[66.8px] w-full">
          Start tracking with Lynq today!
        </h2>
        <p
          className={`font-normal text-muted-foreground text-[18px] leading-[30.8px] max-w-[470px] mt-5`}
        >
          Get meaningful insights from your website through simple,
          privacy-focused analytics that just work.
        </p>
      </div>

      <div
        className={`flex justify-center items-center sm:ml-10 ml-0 sm:mt-0 mt-10`}
      >
        <CtaButton />
      </div>
    </section>
  );
};

export default CTA;
