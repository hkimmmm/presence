import CTASection from "@/components/section/CTASection";
import HeroSection from "@/components/section/HeroSectio";
import ProductSection from "@/components/section/ProductSection";
import TestimonialSection from "@/components/section/TestimonialSection";
import Footer from "@/components/templates/footer";
import Navbar from "@/components/templates/navbar";

export default function Home() {
  return (
    <div className="font-sans">
      <Navbar />
      <HeroSection />
      <ProductSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
}