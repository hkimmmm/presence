"use client";

import Image from "next/image";
import { PhoneIcon } from "@heroicons/react/24/outline";
import cleanImage from "@/assets/images/clean.jpg";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-blue-50 to-teal-50 py-16 sm:py-24">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 items-center px-6 sm:px-16 gap-10">
        <div className="flex flex-col gap-6 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            CV Citra Buana: Solusi Kesehatan & Kebersihan Terpercaya
          </h1>
          <p className="text-lg text-gray-700 max-w-lg">
            Sebagai distributor resmi, kami menyediakan produk berkualitas seperti FreshCare, Dr. White, dan berbagai minyak esensial untuk mendukung hidup sehat dan lingkungan bersih.
          </p>
          <div className="flex gap-4 items-center justify-center md:justify-start flex-col sm:flex-row">
            <a
              href="#products"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-300 shadow-md"
            >
              Lihat Produk Kami
            </a>
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white shadow-md">
              <PhoneIcon className="w-6 h-6 text-blue-600" />
              <div className="flex flex-col text-blue-600">
                <span className="text-sm font-medium">Hubungi Kami</span>
                <span className="text-lg font-semibold">+62895-3800-52394</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <Image
            src={cleanImage}
            alt="Produk CV Citra Buana"
            width={500}
            height={500}
            className="rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </section>
  );
}