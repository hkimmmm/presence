import Footer from "@/components/templates/footer";
import Navbar from "@/components/templates/navbar";
import AboutContent from "@/components/content/AboutContent";

export default function About() {
  return (
    <div className="font-sans">
      <Navbar />
        <AboutContent/>      
      <Footer />
    </div>
  );
}