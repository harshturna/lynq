import CtaButton from "./cta-button";

const Hero = async () => {
  return (
    <section id="home" className="flex md:flex-row flex-col sm:py-16 py-6">
      <div className="flex-1 flex justify-center items-start flex-col xl:px-0 sm:px-16 px-6">
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex-1 font-semibold text-white">
            <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl !leading-[0px]">
              Beyond Simple
            </h3>
            <br />
            <h1 className="text-gradient text-5xl !leading-[60px] md:text-7xl md:!leading-[95px]">
              Web Analytics
            </h1>
          </div>
        </div>
        <p className="font-normal text-muted-foreground text-md md:text-xl leading-[30.8px] max-w-[470px] mt-5">
          See your site&apos;s story unfold. Every click, journey, and
          conversion beautifully visualized
        </p>
        <CtaButton styles="mt-4" />
      </div>

      <div className="flex-1 flex justify-center items-center md:my-0 my-10 relative min-w-[300px] md:min-w-[500px] lg:min-w-[700px]">
        <img
          src="/assets/hero.png"
          alt="hero"
          width="700"
          height="420"
          className="w-[100%] h-[100%] relative z-[5]"
        />
        <div className="absolute z-[0] w-[60%] h-[60%] right-[6rem] bottom-[4rem] md:w-[50%] md:h-[50%] md:right-[12rem] md:bottom-[13rem] blue__gradient" />
      </div>
    </section>
  );
};

export default Hero;
