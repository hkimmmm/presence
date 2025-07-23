"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "../forms/FormLogin";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Ganti riwayat browser saat halaman login dimuat
    window.history.replaceState(null, "", "/auth/login");

    // Tambahkan entri riwayat tambahan untuk mencegah kembali ke halaman sebelumnya
    window.history.pushState(null, "", "/auth/login");

    // Dengarkan event popstate untuk mencegah tombol back
    const handlePopState = () => {
      router.push("/"); // Arahkan ke halaman utama jika tombol back ditekan
    };

    window.addEventListener("popstate", handlePopState);

    // Bersihkan event listener saat komponen unmount
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  // Mencegah back/forward cache dengan menambahkan event unload
  useEffect(() => {
    const preventCache = () => {
      // Tambahkan header atau sinyal untuk mencegah caching
      window.history.replaceState(null, "", "/auth/login");
    };

    window.addEventListener("beforeunload", preventCache);

    return () => {
      window.removeEventListener("beforeunload", preventCache);
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-2xl">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/citra_buana_cemerlang1.png"
            alt="Citra Buana Cemerlang Logo"
            width={150}
            height={150}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-4">
          Login ke Akun Anda
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Silakan masukkan email dan kata sandi untuk masuk ke akun Anda.
        </p>

        <LoginForm />

        <p className="mt-4 text-center text-sm text-gray-600">
          Belum memiliki akun?{" "}
          <Link
            href="/auth/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Daftar Sekarang
          </Link>
        </p>
      </div>
    </main>
  );
}