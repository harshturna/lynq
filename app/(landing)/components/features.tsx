import { features } from "@/constants";
import { LucideIcon } from "lucide-react";

const FeatureCard = ({
  icon: Icon,
  title,
  content,
}: {
  icon: LucideIcon;
  title: string;
  content: string;
}) => (
  <div className="flex flex-row p-6 rounded-[20px]">
    <div className="w-[64px] h-[64px] rounded-full flex justify-center items-center bg-sky-500">
      <Icon />
    </div>
    <div className="flex-1 flex flex-col ml-3">
      <h4 className="font-semibold text-white text-lg mb-1">{title}</h4>
      <p className="font-normal text-muted-foreground text-sm">{content}</p>
    </div>
  </div>
);

const Features = () => (
  <section id="features" className="flex md:flex-row flex-col sm:py-16 py-6">
    <div className="flex-1 flex-col justify-center items-start hidden md:flex">
      <h2 className="text-3xl sm:text-5xl text-white font-semibold">
        Set up Tracking,
        <br />
        in Minutes
      </h2>
      <p
        className={`font-normal text-white/80 text-[18px] leading-[30.8px] max-w-[470px] mt-5 flex flex-col`}
      >
        <span>1. Create an account</span>
        <span>2. Add your website</span>
        <span>3. Start tracking</span>
      </p>
    </div>

    <div className="flex-col max-w-[700px]">
      {features.map((feature) => (
        <FeatureCard
          key={feature.id}
          content={feature.content}
          title={feature.title}
          icon={feature.icon}
        />
      ))}
    </div>
  </section>
);

export default Features;
