import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Problem } from "@/components/landing/Problem";
import { UniqueSellingPoint } from "@/components/landing/UniqueSellingPoint";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Results } from "@/components/landing/Results";
import { UseCases } from "@/components/landing/UseCases";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { BackToTop } from "@/components/landing/BackToTop";

const Landing = () => {
  return (
    <div className="bg-white font-sans">
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Problem />
        <UniqueSellingPoint />
        <Features />
        <HowItWorks />
        <Results />
        <UseCases />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Landing;
