"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Login gagal! Periksa kembali email dan password.");
        return;
      }

      localStorage.setItem("token", result.token);
      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan saat menghubungi server.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {error && (
        <div className="bg-blue-100 text-blue-600 p-2 rounded-md text-sm">{error}</div>
      )}

      <div className="flex flex-col">
        <label htmlFor="email" className="text-sm font-medium text-gray-600">
          Email
        </label>
        <input
          type="text"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="p-2 border rounded-lg focus:ring focus:ring-blue-300"
          placeholder="Masukkan email"
        />
      </div>

      <div className="flex flex-col relative">
        <label htmlFor="password" className="text-sm font-medium text-gray-600">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="p-2 border rounded-lg focus:ring focus:ring-blue-300 w-full pr-10"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
      >
        Login
      </button>
    </form>
  );
}
