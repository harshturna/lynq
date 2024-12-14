const Analytics = () => (
  <section
    id="product"
    className="flex md:flex-row flex-col-reverse sm:py-16 py-6"
  >
    <div className="flex-1 flex justify-center items-center md:mr-10 mr-0 md:mt-0 mt-10 relative">
      <img
        src="/assets/feat1.png"
        alt="feature 1"
        className="w-[100%] h-[100%] relative z-[5]"
      />
      <div className="absolute z-[0] w-[15%] h-[15%] md:w-[30%] md:h-[30%] right-[12rem] bottom-[13rem] blue__gradient" />
    </div>

    <div className="flex-1 flex justify-center items-start flex-col">
      <h2 className="font-poppins font-semibold xs:text-[48px] text-[40px] text-white xs:leading-[76.8px] leading-[66.8px] w-full">
        Track What Moves the Needle
      </h2>
      <p className="font-poppins font-normal text-muted-foreground text-[18px] leading-[30.8px] max-w-[470px] mt-5">
        Get instant insights into your key website metrics - from unique
        visitors to bounce rates. Monitor user behavior, session patterns, and
        engagement trends in one unified view.
      </p>
    </div>
  </section>
);

export default Analytics;
