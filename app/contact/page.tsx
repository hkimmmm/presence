import Footer from "@/components/templates/footer";
import Navbar from "@/components/templates/navbar";
import ContactContent from "@/components/content/ContactContent";

export default function About() {
  return (
    <div className="font-sans">
      <Navbar />
        <ContactContent/>      
      <Footer />
    </div>
  );
}