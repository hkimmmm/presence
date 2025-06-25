"use client";

export default function CTASection() {
  return (
    <section id="contact" className="py-16 bg-blue-600 text-white text-center">
      <div className="container mx-auto px-6 sm:px-16">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Siap untuk Hidup Lebih Sehat dan Bersih?
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Hubungi CV Citra Buana sekarang untuk mendapatkan produk berkualitas tinggi seperti FreshCare, Dr. White, dan minyak esensial. Kami siap melayani kebutuhan Anda!
        </p>
        <a
          href="tel:081234567890"
          className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all duration-300"
        >
          Hubungi Sekarang
        </a>
      </div>
    </section>
  );
}