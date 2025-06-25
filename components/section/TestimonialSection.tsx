"use client";

import { StarIcon } from "@heroicons/react/24/outline";

interface TestimonialCardProps {
  quote: string;
  author: string;
}

function TestimonialCard({ quote, author }: TestimonialCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        {[...Array(5)].map((_, i) => (
          <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
        ))}
      </div>
      <p className="text-gray-600 italic">{quote}</p>
      <p className="mt-4 text-gray-900 font-semibold">{author}</p>
    </div>
  );
}

export default function TestimonialSection() {
  const testimonials = [
    {
      quote: "FreshCare sangat membantu saat saya masuk angin. Praktis dan efektif!",
      author: "— Sari, Jakarta",
    },
    {
      quote: "Dr. White membuat rumah saya bersih dan bebas bakteri. Sangat recomended!",
      author: "— Budi, Surabaya",
    },
  ];

  return (
    <section className="py-16 bg-blue-50">
      <div className="container mx-auto px-6 sm:px-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          Apa Kata Pelanggan Kami
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              quote={testimonial.quote}
              author={testimonial.author}
            />
          ))}
        </div>
      </div>
    </section>
  );
}