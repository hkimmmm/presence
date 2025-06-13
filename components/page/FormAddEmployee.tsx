"use client";

import { useState, useRef, ChangeEvent } from "react";
import Modal from "../ui/Modal";
import Image from "next/image";
import InputField from "@/components/inputs/InputField";
import SelectField from "@/components/inputs/SelectField";
import ButtonBack from "@/components/elements/ButtonBack";
import TextAreaField from "@/components/inputs/TextAreaField";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const FormAddEmployee = () => {
  const [formData, setFormData] = useState({
    foto_profile: null as File | null,
    nik: "",
    nama: "",
    email: "",
    no_telepon: "",
    password: "",
    alamat: "",
    tanggal_bergabung: "",
    status: "aktif",
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi tipe file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage('Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)');
        return;
      }

      // Validasi ukuran file (max 2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        setErrorMessage('Ukuran file terlalu besar. Maksimal 2MB');
        return;
      }

      setFormData({ ...formData, foto_profile: file });
      setErrorMessage('');

      // Buat preview gambar
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Validasi jika ada input yang kosong
    for (const key in formData) {
      if (key !== "foto_profile" && formData[key as keyof typeof formData] === "") {
        setErrorMessage("Semua field harus diisi!");
        setIsLoading(false);
        return;
      }
    }

    if (!formData.foto_profile) {
      setErrorMessage("Foto profil harus diupload!");
      setIsLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('foto_profile', formData.foto_profile);
      formDataToSend.append('nik', formData.nik);
      formDataToSend.append('nama', formData.nama);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('no_telepon', formData.no_telepon);
      formDataToSend.append('alamat', formData.alamat);
      formDataToSend.append('tanggal_bergabung', formData.tanggal_bergabung);
      formDataToSend.append('status', formData.status);

      const response = await fetch("/api/employees", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setIsModalOpen(true);
        setFormData({
          foto_profile: null,
          nik: "",
          nama: "",
          email: "",
          no_telepon: "",
          password: "",
          alamat: "",
          tanggal_bergabung: "",
          status: "aktif",
        });
        setPreviewImage(null);
      } else {
        setErrorMessage(data.error || "Gagal menambahkan Sales!");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("Terjadi kesalahan server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-2">
      <div className="flex items-center mb-4">
        <ButtonBack />
      </div>

      <h2 className="text-3xl font-bold text-blue-600 mb-6">Tambah Sales</h2>

      {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Upload Foto Profil */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Foto Profil</label>
          <div className="flex items-center gap-4">
            <div 
              onClick={triggerFileInput}
              className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-500 transition"
            >
             {previewImage ? (
  <div className="relative w-full h-full">
    <Image
      src={previewImage}
      alt="Preview"
      fill
      className="object-cover"
      unoptimized // Diperlukan karena ini adalah blob URL
    />
  </div>
) : (
  <span className="text-gray-500">+ Upload</span>
)}
            </div>
            <div>
              <p className="text-sm text-gray-500">Format: JPEG, PNG, GIF, WebP</p>
              <p className="text-sm text-gray-500">Maksimal: 2MB</p>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="NIK" type="text" name="nik" value={formData.nik} onChange={handleChange} placeholder="Masukkan NIK" />
          <InputField label="Nama" type="text" name="nama" value={formData.nama} onChange={handleChange} placeholder="Masukkan Nama" />
          <InputField label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Masukkan Email" />
          <InputField label="No. Telepon" type="text" name="no_telepon" value={formData.no_telepon} onChange={handleChange} placeholder="Masukkan No. Telepon" />

          <div className="relative">
            <InputField label="Password" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Masukkan Password" />
            <button type="button" onClick={togglePasswordVisibility} className="absolute top-9 right-3 text-gray-500 hover:text-gray-700">
              {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
            </button>
          </div>

          <TextAreaField label="Alamat" name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Masukkan Alamat" />
          <InputField label="Tanggal Bergabung" type="date" name="tanggal_bergabung" value={formData.tanggal_bergabung} onChange={handleChange} />
          <SelectField label="Status" name="status" value={formData.status} onChange={handleChange} options={[{ value: "aktif", label: "Aktif" }, { value: "nonaktif", label: "Nonaktif" }]} />
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
            disabled={isLoading}
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </form>

      {/* Modal Notifikasi */} 
      <Modal
        isOpen={isModalOpen}
        title="Sukses"
        message="Sales berhasil ditambahkan!"
        type="success"
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default FormAddEmployee;