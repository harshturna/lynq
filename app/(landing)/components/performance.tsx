const Performance = () => (
  <section className="flex md:flex-row flex-col sm:py-16 py-6">
    <div className="flex-1 flex justify-center items-start flex-col">
      <h2 className="font-semibold xs:text-[48px] text-[40px] text-white xs:leading-[76.8px] leading-[66.8px] w-full">
        Performance at a Glance
      </h2>
      <p className="font-normal text-muted-foreground text-[18px] leading-[30.8px] max-w-[470px] mt-5">
        Keep your site running at peak efficiency with real-time Core Web Vitals
        monitoring. Track LCP, INP, CLS, and other critical performance metrics
        that impact your user experience and SEO rankings.
      </p>
    </div>

    <div className="flex-1 flex justify-center items-center md:ml-10 ml-0 md:mt-0 mt-10 relative">
      <img
        src="/assets/feat2.png"
        alt="Feat 2"
        className="w-[100%] h-[100%] z-[1]"
      />
      <div className="absolute z-[0] w-[50%] h-[50%] right-[12rem] bottom-[13rem] blue__gradient" />
    </div>
  </section>
);

export default Performance;
