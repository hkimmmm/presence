"use client";

import Image from "next/image";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Button from '@/components/ui/Button';
import InputField from "@/components/ui/InputField";
import Pagination from "@/components/ui/Pagination";
import { useRouter } from "next/navigation";
import { Employee } from "@/types/Employee";
import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [originalEmployees, setOriginalEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const router = useRouter();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Employee>>({});

  const columns = ["Foto Profile", "NIK", "Nama", "Email", "Alamat", "No Telepon", "Tanggal Bergabung", "Status"];
  const itemsPerPage = 5;

  const formatUTCDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (value: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return value;
    }
    
    return date.toISOString();
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");

        if (!response.ok) {
          throw new Error(`Gagal mengambil data: ${response.status}`);
        }

        const data: Employee[] = await response.json();
        setEmployees(data);
        setOriginalEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
        setOriginalEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const confirmDelete = () => {
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/employees`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedEmployees }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menghapus sales");
      }

      setEmployees(prev => prev.filter(emp => !selectedEmployees.includes(emp.id)));
      setOriginalEmployees(prev => prev.filter(emp => !selectedEmployees.includes(emp.id)));
      setSelectedEmployees([]);
      setIsConfirmOpen(false);
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Error deleting employees:", err);
      alert(err instanceof Error ? err.message : "Gagal menghapus sales");
    }
  };

  const handleSelectionChange = (selectedIndexes: number[]) => {
    const selectedIds = selectedIndexes.map(index => filteredData[index].id);
    setSelectedEmployees(selectedIds);
  };

  const startEditing = (id: number) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      setEditingId(id);
      setEditData({
        foto_profile: employee.foto_profile,
        nik: employee.nik,
        nama: employee.nama,
        email: employee.email,
        alamat: employee.alamat,
        no_telepon: employee.no_telepon,
        tanggal_bergabung: formatUTCDate(employee.tanggal_bergabung),
        status: employee.status
      });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof Employee, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: field === 'tanggal_bergabung' ? handleDateChange(value) : value
    }));
  };

  const saveEditing = async (id: number) => {
    try {
      const response = await fetch(`/api/employees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memperbarui data sales");
      }

      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...editData } : emp
      ));
      setOriginalEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...editData } : emp
      ));
      setEditingId(null);
      setEditData({});
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Error updating employee:", err);
      alert(err instanceof Error ? err.message : "Gagal memperbarui data sales");
    }
  };

  const handleRowDoubleClick = (id: number) => {
    startEditing(id);
  };

  const filteredData = employees.filter(
    (emp) =>
      (filter === "all" || emp.status === filter) &&
      emp.nama.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Sales</h1>
        <div className="flex items-center gap-4">
          {/* Delete button - now matches LeavesPage style */}
          <button
            className={`p-2 rounded-md flex items-center ${
              selectedEmployees.length > 0 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={selectedEmployees.length === 0}
            onClick={confirmDelete}
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          
          {/* Search button */}
          <div className="relative">
            <button
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
            </button>
            {isSearchOpen && (
              <InputField
                placeholder="Cari nama sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="absolute right-0 top-10 w-64 bg-white shadow-md rounded-md border border-gray-200 px-3 py-2"
              />
            )}
          </div>

          {/* Filter button */}
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
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${filter === "all" ? "font-bold" : ""}`}
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
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${filter === "aktif" ? "font-bold" : ""}`}
                      onClick={() => {
                        setFilter("aktif");
                        setIsFilterOpen(false);
                      }}
                    >
                      Aktif
                    </button>
                  </li>
                  <li>
                    <button
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${filter === "nonaktif" ? "font-bold" : ""}`}
                      onClick={() => {
                        setFilter("nonaktif");
                        setIsFilterOpen(false);
                      }}
                    >
                      Nonaktif
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Add employee button */}
          <Button
            variant="primary"
            onClick={() => router.push("/dashboard/employee/add")}
            className="flex items-center gap-1 px-1.5 py-2.5 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Tambah sales
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Memuat data sales...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Tidak ada data sales.</p>
          </div>
        ) : (
          <>
            <Table 
              columns={columns} 
              data={paginatedData.map((item) => [
                editingId === item.id ? (
                  <div className="relative w-12 h-12">
                    <Image
                      src={editData.foto_profile || '/default-profile.jpg'}
                      alt="Profile Preview"
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleEditChange("foto_profile", event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div 
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="relative w-12 h-12"
                  >
                    <Image
                      src={item.foto_profile || '/default-profile.jpg'}
                      alt={`${item.nama}'s Profile`}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                ),
                
                editingId === item.id ? (
                  <InputField
                    value={editData.nik || ""}
                    onChange={(e) => handleEditChange("nik", e.target.value)}
                    className="w-full max-w-[120px]"
                  />
                ) : (
                  <div 
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[100px] max-w-[150px] truncate"
                  >
                    {item.nik}
                  </div>
                ),
                
                editingId === item.id ? (
                  <InputField
                    value={editData.nama || ""}
                    onChange={(e) => handleEditChange("nama", e.target.value)}
                    className="w-full max-w-[100px]"
                  />
                ) : (
                  <div 
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[100px] max-w-[200px] truncate"
                  >
                    {item.nama}
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
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[140px] max-w-[120px] truncate"
                  >
                    {item.email}
                  </div>
                ),
                
                editingId === item.id ? (
                  <InputField
                    value={editData.alamat || ""}
                    onChange={(e) => handleEditChange("alamat", e.target.value)}
                    className="w-full max-w-[120px]"
                  />
                ) : (
                  <div 
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[120px] max-w-[250px] truncate"
                  >
                    {item.alamat}
                  </div>
                ),
                
                editingId === item.id ? (
                  <InputField
                    value={editData.no_telepon || ""}
                    onChange={(e) => handleEditChange("no_telepon", e.target.value)}
                    className="w-full max-w-[120px]"
                  />
                ) : (
                  <div 
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[100px] max-w-[150px] truncate"
                  >
                    {item.no_telepon}
                  </div>
                ),

                editingId === item.id ? (
                  <input
                    type="date"
                    value={editData.tanggal_bergabung || ''}
                    onChange={(e) => handleEditChange("tanggal_bergabung", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                ) : (
                  <div onDoubleClick={() => handleRowDoubleClick(item.id)}>
                    {formatUTCDate(item.tanggal_bergabung)}
                  </div>
                ),
                
                editingId === item.id ? (
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <select
                      value={editData.status || "aktif"}
                      onChange={(e) => handleEditChange("status", e.target.value as "aktif" | "nonaktif")}
                      className="px-3 py-1 rounded-full text-sm border border-gray-300 max-w-[120px]"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                    <button
                      onClick={() => saveEditing(item.id)}
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
                    onDoubleClick={() => handleRowDoubleClick(item.id)}
                    className="min-w-[120px]"
                  >
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        item.status === "aktif" ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                )
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
        message="Apakah Anda yakin ingin menghapus sales yang dipilih?" 
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

export default EmployeeList;