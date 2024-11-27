import Analytics from "./components/analytics";
import CTA from "./components/cta";
import Feats from "./components/feats";
import Features from "./components/features";
import Footer from "./components/footer";
import Hero from "./components/hero";
import Navbar from "./components/navbar";
import Performance from "./components/performance";

const LadingPage = () => {
  return (
    <div className="max-w-[1480px] mx-auto">
      <div className="sm:px-12 px-4 flex justify-center items-center">
        <Navbar />
      </div>
      <div className="flex justify-center items-start">
        <div>
          <Hero />
        </div>
      </div>
      <div className="sm:px-16 px-6 flex">
        <div className="w-full">
          <Feats />
          <Features />
          <Analytics />
          <Performance />
          <CTA />
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default LadingPage;
