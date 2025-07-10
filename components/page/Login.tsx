"use client";

import LoginForm from "../forms/FormLogin";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="w-full max-w-lg p-6 bg-white shadow-xl rounded-2xl">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-4">
          Masuk Akun
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Masukkan email dan password kamu untuk melanjutkan.
        </p>

        <LoginForm />

        <p className="mt-4 text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/auth/register" className="text-blue-600 font-medium hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
