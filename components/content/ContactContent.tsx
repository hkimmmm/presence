"use client";

import { PhoneIcon, EnvelopeIcon, MapPinIcon, ClockIcon } from "@heroicons/react/24/outline";
import ContactForm from "./ContactForm"; 

export default function ContactContent() {
  return (
    <section className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Hubungi Kami</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Tim CV Citra Buana Cemerlang siap membantu Anda. Silakan hubungi melalui informasi kontak di bawah atau isi formulir untuk pertanyaan lebih lanjut.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Informasi Kontak */}
        <div className="bg-white rounded-xl shadow-md p-8 h-fit">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Informasi Kontak</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <PhoneIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Telepon/WhatsApp</h3>
                <a 
                  href="https://wa.me/620882007615146" 
                  className="text-lg text-gray-600 hover:text-blue-600 transition-colors block mt-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  0882-0076-15146
                </a>
                <p className="text-sm text-gray-500 mt-1">Senin - Sabtu, 08.00 - 17.00 WIB</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <EnvelopeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email</h3>
                <a 
                  href="mailto:info@citrabuanacemerlang.com" 
                  className="text-lg text-gray-600 hover:text-blue-600 transition-colors block mt-1"
                >
                  info@citrabuanacemerlang.com
                </a>
                <p className="text-sm text-gray-500 mt-1">Respon dalam 1x24 jam</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-amber-100 p-3 rounded-full">
                <MapPinIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Alamat Kantor</h3>
                <p className="text-lg text-gray-600 mt-1">
                  344X+RF5, Jl. Raya Banjaran-Balamoa<br />
                  Sente, Bedug, Kec. Pangkah<br />
                  Kabupaten Tegal, Jawa Tengah 52471
                </p>
                <a 
                  href="https://maps.app.goo.gl/QWJ5QJGhnCw2y9Rp9" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mt-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat di Google Maps
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Jam Operasional</h3>
                <div className="text-lg text-gray-600 mt-1">
                  <p>Senin - Jumat: 08.00 - 17.00 WIB</p>
                  <p>Sabtu: 08.00 - 15.00 WIB</p>
                  <p className="text-red-500">Minggu & Hari Libur: Tutup</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Kontak */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Kirim Pesan</h2>
          <ContactForm />
        </div>
      </div>

      {/* Peta Lokasi */}
      <div className="mt-16 rounded-xl overflow-hidden shadow-lg border border-gray-200">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.5607454554424!2d109.14615377388718!3d-6.942981093057096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6fb90007827fbb%3A0x36fa29d3e5baf685!2sCV.%20Citra%20Buana%20Cemerlang!5e0!3m2!1sid!2sid!4v1750844916573!5m2!1sid!2sid"
          width="100%"
          height="450"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Lokasi CV Citra Buana Cemerlang"
        ></iframe>
      </div>
    </section>
  );
}