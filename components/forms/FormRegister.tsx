"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  nik?: string;
  nama?: string;
  no_telepon?: string;
  alamat?: string;
}

export default function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "sales",
    nik: "",
    nama: "",
    no_telepon: "",
    alamat: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Password dan Konfirmasi Password tidak sama!");
      return;
    }
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Gagal mendaftarkan akun!");
        return;
      }
      alert("Registrasi berhasil!");
      router.push("/auth/login");
    } catch {
      setError("Terjadi kesalahan saat menghubungi server.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg rounded-xl p-6 space-y-4"
    >
      {error && (
        <div className="bg-red-100 text-red-600 p-2 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col">
        <label htmlFor="username" className="text-sm font-medium text-gray-600">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          className="p-2 border rounded-lg focus:ring focus:ring-blue-300 text-sm"
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="email" className="text-sm font-medium text-gray-600">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="p-2 border rounded-lg focus:ring focus:ring-blue-300 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[{ label: "Password", name: "password", show: showPassword, setShow: setShowPassword },
          { label: "Konfirmasi Password", name: "confirmPassword", show: showConfirmPassword, setShow: setShowConfirmPassword }].map(({ label, name, show, setShow }) => (
          <div key={name} className="flex flex-col relative">
            <label htmlFor={name} className="text-sm font-medium text-gray-600">{label}</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                id={name}
                name={name}
                value={form[name as keyof RegisterFormData] || ""}
                onChange={handleChange}
                required
                className="p-2 border rounded-lg focus:ring focus:ring-blue-300 text-sm w-full pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-2 text-gray-500"
                onClick={() => setShow((prev) => !prev)}
              >
                {show ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        <label htmlFor="role" className="text-sm font-medium text-gray-600">Pilih Role</label>
        <select id="role" name="role" value={form.role} onChange={handleChange} required className="p-2 border rounded-lg focus:ring focus:ring-blue-300 text-sm">
          <option value="admin">Admin</option>
          <option value="sales">Sales</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {form.role === "sales" && (
        <div className="grid grid-cols-2 gap-4">
          {[{ label: "NIK", name: "nik" }, { label: "Nama", name: "nama" }, { label: "No. Telepon", name: "no_telepon" }, { label: "Alamat", name: "alamat" }].map(({ label, name }) => (
            <div key={name} className="flex flex-col">
              <label htmlFor={name} className="text-sm font-medium text-gray-600">{label}</label>
              <input
                type="text"
                id={name}
                name={name}
                value={form[name as keyof RegisterFormData] || ""}
                onChange={handleChange}
                className="p-2 border rounded-lg text-sm"
                required
              />
            </div>
          ))}
        </div>
      )}

      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition">
        Daftar
      </button>
    </form>
  );
}
