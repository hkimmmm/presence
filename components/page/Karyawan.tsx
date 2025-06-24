"use client";

import Image from "next/image";
import Table from "@/components/ui/Table";

import InputField from "@/components/ui/InputField";
import Pagination from "@/components/ui/Pagination";

import { Employee } from "@/types/Employee";
import React, { useState, useEffect } from "react";
import { FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";

const Karyawan: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const columns = ["Foto Profile", "NIK", "Nama", "Email", "Alamat", "No Telepon", "Tanggal Bergabung", "Status"];
  const itemsPerPage = 5;

  const formatUTCDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
      } catch (err) {
        console.error("Error fetching employees:", err);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

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
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Sales</h1>
        <div className="flex items-center gap-4">
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
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
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
                <div key={`foto-${item.nik}`} className="relative w-12 h-12">
                  <Image
                    src={item.foto_profile || '/default-profile.jpg'}
                    alt={`${item.nama}'s Profile`}
                    width={48}
                    height={48}
                    className="rounded-full object-cover"
                  />
                </div>,
                <div key={`nik-${item.nik}`} className="min-w-[100px] max-w-[120px] truncate">
                  {item.nik}
                </div>,
                <div key={`nama-${item.nik}`} className="min-w-[100px] max-w-[200px] truncate">
                  {item.nama}
                </div>,
                <div key={`email-${item.nik}`} className="min-w-[140px] max-w-[120px] truncate">
                  {item.email}
                </div>,
                <div key={`alamat-${item.nik}`} className="min-w-[140px] max-w-[120px] truncate">
                  {item.alamat}
                </div>,
                <div key={`telepon-${item.nik}`} className="min-w-[100px] max-w-[150px] truncate">
                  {item.no_telepon}
                </div>,
                <div key={`tanggal-${item.nik}`}>
                  {formatUTCDate(item.tanggal_bergabung)}
                </div>,
                <div key={`status-${item.nik}`} className="min-w-[120px]">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      item.status === "aktif" ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ])}
              // Hapus onSelectionChange karena tidak ada seleksi lagi
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Karyawan;