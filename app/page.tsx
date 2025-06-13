"use client";

import Image from "next/image";
import { PhoneIcon } from "@heroicons/react/24/outline";
import Navbar from "@/components/templates/navbar";
import cleanImage from "@/assets/images/clean.jpg";

export default function Home() {
  return (
    <>
      <Navbar /> {/* Navbar hanya ada di halaman Home */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-center p-8 pb-12 gap-10 sm:p-16 font-[family-name:var(--font-geist-sans)]">
        {/* Bagian Kiri - Teks */}
        <main className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900">
            Solusi Pembersihan Modern untuk Lingkungan yang Lebih Sehat
          </h1>
          <p className="text-gray-700">
            Dr. White menghadirkan alat pembersih berkualitas tinggi yang efektif menghilangkan bakteri dan kotoran. Dapatkan kebersihan maksimal dengan teknologi terbaru.
          </p>
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <a
              className="bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-all"
              href="#learn-more"
            >
              Pelajari Lebih Lanjut
            </a>
            {/* Call Us Section */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg">
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-md">
                <PhoneIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex flex-col text-blue-600">
                <span className="text-sm font-medium">Call Us Now</span>
                <span className="text-lg font-semibold">08######</span>
              </div>
            </div>
          </div>
        </main>

        {/* Bagian Kanan - Gambar */}
        <div className="flex justify-center">
          <Image
            src={cleanImage}
            alt="Alat Pembersih Dr. White"
            width={500}
            height={500}
            className="rounded-lg shadow-lg"
          />
        </div>
      </div>
    </>
  );
}
