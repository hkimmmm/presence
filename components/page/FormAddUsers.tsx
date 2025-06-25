"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import InputField from "@/components/inputs/InputField";
import SelectField from "@/components/inputs/SelectField";
import ButtonBack from "@/components/elements/ButtonBack";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const FormAddUser = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "karyawan",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    // Validate required fields
    if (!formData.username || !formData.email || !formData.password || !formData.role) {
      setErrorMessage("All fields are required!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsModalOpen(true);
        setFormData({
          username: "",
          email: "",
          password: "",
          role: "karyawan",
        });
      } else {
        throw new Error(data.error || "Failed to add user");
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Server error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="flex items-center mb-4">
        <ButtonBack />
      </div>

      <h2 className="text-2xl font-bold text-blue-600 mb-6">Add User</h2>

      {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter Username"
          />
          <InputField
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter Email"
          />
          <div className="relative">
            <InputField
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter Password"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute top-9 right-3 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
            </button>
          </div>
          <SelectField
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={[
              { value: "admin", label: "Admin" },
              { value: "sales", label: "Sales" },
              { value: "supervisor", label: "Supervisor" },
              { value: "karyawan", label: "Karyawan" },
            ]}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Data"}
          </button>
        </div>
      </form>

      <Modal
        isOpen={isModalOpen}
        title="Success"
        message="User successfully added!"
        type="success"
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default FormAddUser;