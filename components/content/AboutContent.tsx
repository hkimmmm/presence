export default function AboutContent() {
  return (
    <section className="container mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Deskripsi Perusahaan */}
        <div className="md:w-1/2">
          <h1 className="text-3xl font-bold mb-6">Tentang Kami</h1>
          <p className="text-lg mb-6">
            CV Citra Buana Cemerlang adalah perusahaan distributor resmi produk kesehatan dan kebersihan yang telah dipercaya sejak 2010. Kami menyediakan produk-produk berkualitas tinggi seperti FreshCare, Dr. White, dan berbagai kebutuhan rumah tangga lainnya.
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-blue-600">Visi</h3>
              <p>Menjadi distributor terdepan dalam menyediakan solusi kesehatan dan kebersihan untuk keluarga Indonesia.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-blue-600">Misi</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Menyediakan produk berkualitas dengan harga kompetitif</li>
                <li>Memberikan pelayanan terbaik kepada pelanggan</li>
                <li>Mengutamakan kepuasan dan kesehatan konsumen</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Peta Lokasi */}
        <div className="md:w-1/2 h-96 bg-gray-100 rounded-lg overflow-hidden shadow-lg">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.5607454554424!2d109.14615377388718!3d-6.942981093057096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6fb90007827fbb%3A0x36fa29d3e5baf685!2sCV.%20Citra%20Buana%20Cemerlang!5e0!3m2!1sid!2sid!4v1750844916573!5m2!1sid!2sid" 
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-lg"
            title="Lokasi CV Citra Buana Cemerlang"
          >
          </iframe>
          
          <div className="p-4 bg-white">
            <h3 className="font-semibold text-lg">Lokasi Kami</h3>
            <p className="text-gray-600">Jl. Contoh No. 123, Kota Semarang, Jawa Tengah</p>
            <p className="text-gray-600">Buka: Senin-Sabtu, 08.00-17.00 WIB</p>
          </div>
        </div>
      </div>

      {/* Tim Kami */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Tim Kami</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: "Budi Santoso", position: "Direktur Utama" },
            { name: "Ani Wijaya", position: "Manajer Pemasaran" },
            { name: "Rudi Hermawan", position: "Manajer Operasional" },
            { name: "Siti Aminah", position: "Customer Service" },
          ].map((member, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow text-center">
              <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full mb-3"></div>
              <h4 className="font-semibold">{member.name}</h4>
              <p className="text-sm text-gray-600">{member.position}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
