
"use client";

import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputField";
import Pagination from "@/components/ui/Pagination";
import { useRouter } from "next/navigation";
import { Users } from "@/types/Users";
import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

const UserList: React.FC = () => {
  const [users, setUsers] = useState<Users[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [originalUsers, setOriginalUsers] = useState<Users[]>([]);
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const router = useRouter();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Users>>({});

  const columns = ["Username", "Email", "Role"];
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const data: Users[] = await response.json();
        setUsers(data);
        setOriginalUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
        setOriginalUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const confirmDelete = () => {
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUsers[0] }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      setUsers((prev) => prev.filter((user) => !selectedUsers.includes(user.id!)));
      setOriginalUsers((prev) => prev.filter((user) => !selectedUsers.includes(user.id!)));
      setSelectedUsers([]);
      setIsConfirmOpen(false);
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Error deleting users:", err);
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleSelectionChange = (selectedIndexes: number[]) => {
    const selectedIds = selectedIndexes.map((index) => filteredData[index].id!);
    setSelectedUsers(selectedIds);
  };

  const startEditing = (id: number) => {
    const user = users.find((user) => user.id === id);
    if (user) {
      setEditingId(id);
      setEditData({
        username: user.username,
        email: user.email,
        role: user.role,
        password: "",
      });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof Users, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveEditing = async (id: number) => {
    try {
      const response = await fetch(`/api/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editData }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, ...editData } : user))
      );
      setOriginalUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, ...editData } : user))
      );
      setEditingId(null);
      setEditData({});
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Error updating user:", err);
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleRowDoubleClick = (id: number) => {
    startEditing(id);
  };

  const filteredData = users.filter(
    (user) =>
      (filter === "all" || user.role === filter) &&
      user.username.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
        <h1 className="text-2xl font-bold text-gray-800">Daftar User</h1>
        <div className="flex items-center gap-4">
          <button
            className={`p-2 rounded-md flex items-center ${
              selectedUsers.length > 0
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            disabled={selectedUsers.length === 0}
            onClick={confirmDelete}
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
            </button>
            {isSearchOpen && (
              <InputField
                placeholder="Cari username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="absolute right-0 top-10 w-64 bg-white shadow-md rounded-md border border-gray-200 px-3 py-2"
              />
            )}
          </div>

          <div className="relative">
            <button
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FunnelIcon className="w-5 h-5 text-gray-600" />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white shadow-md rounded-md border border-gray-200">
                <ul className="text-sm text-gray-700">
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        filter === "all" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setFilter("all");
                        setIsFilterOpen(false);
                      }}
                    >
                      Semua
                    </button>
                  </li>
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        filter === "admin" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setFilter("admin");
                        setIsFilterOpen(false);
                      }}
                    >
                      Admin
                    </button>
                  </li>
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        filter === "sales" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setFilter("sales");
                        setIsFilterOpen(false);
                      }}
                    >
                      Sales
                    </button>
                  </li>
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        filter === "supervisor" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setFilter("supervisor");
                        setIsFilterOpen(false);
                      }}
                    >
                      Supervisor
                    </button>
                  </li>
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        filter === "karyawan" ? "font-bold" : ""
                      }`}
                      onClick={() => {
                        setFilter("karyawan");
                        setIsFilterOpen(false);
                      }}
                    >
                      Karyawan
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            onClick={() => router.push("/dashboard/user/add")}
            className="flex items-center gap-1 px-1.5 py-2.5 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah User
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Memuat data users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Tidak ada data users.</p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedData.map((item) => [
                editingId === item.id ? (
                  <InputField
                    value={editData.username || ""}
                    onChange={(e) => handleEditChange("username", e.target.value)}
                    className="w-full max-w-[120px]"
                  />
                ) : (
                  <div
                    onDoubleClick={() => handleRowDoubleClick(item.id!)}
                    className="min-w-[100px] max-w-[120px] truncate"
                  >
                    {item.username}
                  </div>
                ),
                editingId === item.id ? (
                  <InputField
                    value={editData.email || ""}
                    onChange={(e) => handleEditChange("email", e.target.value)}
                    className="w-full max-w-[120px]"
                  />
                ) : (
                  <div
                    onDoubleClick={() => handleRowDoubleClick(item.id!)}
                    className="min-w-[140px] max-w-[120px] truncate"
                  >
                    {item.email}
                  </div>
                ),
                editingId === item.id ? (
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <select
                      value={editData.role || "karyawan"}
                      onChange={(e) =>
                        handleEditChange(
                          "role",
                          e.target.value as "admin" | "sales" | "supervisor" | "karyawan"
                        )
                      }
                      className="px-3 py-1 rounded-full text-sm border border-gray-300 max-w-[120px]"
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="karyawan">Karyawan</option>
                    </select>
                    <button
                      onClick={() => saveEditing(item.id!)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="Simpan"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Batal"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDoubleClick={() => handleRowDoubleClick(item.id!)}
                    className="min-w-[120px]"
                  >
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        item.role === "admin"
                          ? "text-blue-700 bg-blue-100"
                          : item.role === "sales"
                          ? "text-green-700 bg-green-100"
                          : item.role === "supervisor"
                          ? "text-purple-700 bg-purple-100"
                          : "text-gray-700 bg-gray-100"
                      }`}
                    >
                      {item.role}
                    </span>
                  </div>
                ),
              ])}
              onSelectionChange={handleSelectionChange}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={isConfirmOpen}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus user yang dipilih?"
        type="confirm"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        confirmText="Hapus"
      />

      <Modal
        isOpen={isSuccessOpen}
        title="Sukses"
        message="Operasi berhasil dilakukan!"
        type="success"
        onClose={() => setIsSuccessOpen(false)}
      />
    </div>
  );
};

export default UserList;