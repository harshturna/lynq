import { feats } from "@/constants";

const Feats = () => (
  <section
    className={`flex items-start flex-row flex-wrap sm:mb-20 mb-6 w-full`}
  >
    {feats.map((feat) => (
      <div key={feat.id} className={`flex-1 flex items-center flex-col m-3`}>
        <h4 className="font-semibold  mb-2 text-3xl md:text-4xl xs:leading-[53.16px] leading-[43.16px] text-white">
          {feat.title}
        </h4>
        <p className="font-bold text-xs md:text-sm text-center  xs:leading-[26.58px] leading-[21.58px] text-gradient ml-3">
          {feat.value}
        </p>
      </div>
    ))}
  </section>
);

export default Feats;
