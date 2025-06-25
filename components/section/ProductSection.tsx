"use client";

import Image from "next/image";
import cleanImage from "@/assets/images/drwhite.jpg";
import freshcareImage from "@/assets/images/freshcare.jpg";
import PapayaImage from "@/assets/images/papaya2.jpg";

import type { StaticImageData } from "next/image";

interface ProductCardProps {
  imageSrc: string | StaticImageData;
  altText: string;
  title: string;
  description: string;
}

function ProductCard({ imageSrc, altText, title, description }: ProductCardProps) {
  return (
 <div className="bg-gray-50 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
  <div className="mb-4">
    <Image
      src={imageSrc}
      alt={altText}
      width={300}
      height={300}
      className="rounded-lg w-full h-auto object-cover"
    />
  </div>
  
  <div className="flex-grow flex flex-col">
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4 flex-grow">{description}</p>
    <a
      href="#contact"
      className="mt-auto text-blue-600 font-medium hover:underline self-start"
    >
      Pelajari Lebih Lanjut →
    </a>
  </div>
</div>
  );
}

export default function ProductSection() {
  const products: ProductCardProps[] = [
    {
      imageSrc: freshcareImage,
      altText: "FreshCare Aromatherapy",
      title: "FreshCare",
      description:
        "Minyak angin aromaterapi multifungsi dengan roll-on, kerokan, pijat, dan inhaler. Solusi cepat untuk sakit kepala dan masuk angin.",
    },
    {
      imageSrc: cleanImage,
      altText: "Sikat Gigi Dr. White",
      title: "Dr. White Dental Care",
      description:
        "Sikat gigi premium dari Dr. White dengan bulu ultra lembut yang efektif membersihkan plak tanpa merusak gusi, dilengkapi dengan desain pegangan ergonomis untuk kenyamanan maksimal.",
    },
    {
      imageSrc: PapayaImage,
      altText: "Sabun Wajah Papaya",
      title: "Sabun Papaya",
      description:
        "Sabun pembersih wajah dengan ekstrak pepaya untuk kulit lebih cerah dan bersih, cocok untuk semua jenis kulit.",
    }
  ];

  return (
    <section id="products" className="py-16 bg-white">
      <div className="container mx-auto px-6 sm:px-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          Produk Unggulan Kami
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <ProductCard
              key={index}
              imageSrc={product.imageSrc}
              altText={product.altText}
              title={product.title}
              description={product.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}