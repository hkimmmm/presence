"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  TrashIcon, 
  PlusIcon, 
  XMarkIcon, 
  CheckIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Modal from "@/components/ui/Modal";
import InputField from '@/components/ui/InputField';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { Leave } from '@/types/Leave';

const COLUMNS = [
  'Nama Karyawan',
  'Jenis Cuti',
  'Tanggal Mulai',
  'Tanggal Selesai',
  'Status',
  'Approved By',
  'Keterangan',
  'Foto Bukti',
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export default function LeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [selectedLeaves, setSelectedLeaves] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | Leave['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Leave>>({});

  const ITEMS_PER_PAGE = 5;

useEffect(() => {
  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token tidak ditemukan');

      const response = await fetch('/api/leave', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
      });

      if (!response.ok) throw new Error('Failed to fetch leave data');
      
      const data: Leave[] = await response.json();
      setLeaves(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  fetchLeaves();
}, []);


  const filteredLeaves = leaves.filter((leave) => {
    const matchesFilter = filter === 'all' || leave.status === filter;
    const matchesSearch =
      leave.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      leave.jenis.toLowerCase().includes(search.toLowerCase()) ||
      leave.karyawan_nama?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE);
  const paginatedLeaves = filteredLeaves.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startEditing = (id: number) => {
    const leaveToEdit = leaves.find(leave => leave.id === id);
    if (leaveToEdit) {
      setEditingId(id);
      setEditData({ ...leaveToEdit });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof Leave, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

 const saveEditing = async (id: number) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Token tidak ditemukan. Silakan login kembali.");
    }

    const response = await fetch(`/api/leave`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ id, ...editData }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || "Gagal memperbarui data cuti");
    }

    setLeaves(prev =>
      prev.map(leave => (leave.id === id ? { ...leave, ...editData } : leave))
    );
    setEditingId(null);
    setEditData({});
    setIsSuccessOpen(true);
  } catch (err) {
    console.error("Error updating leave:", err);
    alert(err instanceof Error ? err.message : "Gagal memperbarui data cuti");
  }
};


  const handleRowDoubleClick = (id: number) => {
    startEditing(id);
  };

  const confirmDelete = () => setIsConfirmOpen(true);

  const handleDelete = async () => {
    try {
      const response = await fetch('/api/leave', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedLeaves }),
      });

      if (!response.ok) throw new Error('Failed to delete leaves');

      setLeaves(leaves.filter((leave) => !selectedLeaves.includes(leave.id!)));
      setSelectedLeaves([]);
      setIsConfirmOpen(false);
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error deleting leaves:', error);
    }
  };

  const renderStatusCell = (leave: Leave) => {
    if (editingId === leave.id) {
      return (
        <div className="flex items-center gap-2 min-w-[180px]">
          <select
            value={editData.status || "pending"}
            onChange={(e) => handleEditChange("status", e.target.value)}
            className="px-3 py-1 rounded-full text-sm border border-gray-300 max-w-[120px]"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => saveEditing(leave.id!)}
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
      );
    }

    const statusStyles = {
      approved: 'text-green-700 bg-green-100',
      rejected: 'text-red-700 bg-red-100',
      pending: 'text-yellow-700 bg-yellow-100'
    };

    return (
      <div 
        onDoubleClick={() => handleRowDoubleClick(leave.id!)}
        className="min-w-[120px]"
      >
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            statusStyles[leave.status as keyof typeof statusStyles] || statusStyles.pending
          }`}
        >
          {leave.status || 'pending'}
        </span>
      </div>
    );
  };

  const renderNoteCell = (leave: Leave) => {
    if (editingId === leave.id) {
      return (
        <InputField
          value={editData.keterangan || ""}
          onChange={(e) => handleEditChange("keterangan", e.target.value)}
          className="w-full max-w-[120px]"
        />
      );
    }
    return (
      <div 
        onDoubleClick={() => handleRowDoubleClick(leave.id!)}
        className="min-w-[100px] max-w-[150px] truncate"
      >
        {leave.keterangan}
      </div>
    );
  };

  const renderEvidenceCell = (leave: Leave) => {
    if (!leave.foto_bukti) return '-';
    
    return (
      <div className="w-12 h-12 relative">
        <Image
          src={leave.foto_bukti}
          alt="Bukti"
          fill
          className="rounded object-cover"
        />
      </div>
    );
  };

  const tableData = paginatedLeaves.map((leave) => [
    leave.karyawan_nama || '-',
    leave.jenis,
    new Date(leave.tanggal_mulai).toLocaleDateString(),
    new Date(leave.tanggal_selesai).toLocaleDateString(),
    renderStatusCell(leave),
    leave.approver_username || '-',
    renderNoteCell(leave),
    renderEvidenceCell(leave),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Cuti</h1>
        
        <div className="flex items-center gap-4">
          {/* Delete Button */}
          <button
            className={`p-2 rounded-md flex items-center ${
              selectedLeaves.length > 0
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={selectedLeaves.length === 0}
            onClick={confirmDelete}
          >
            <TrashIcon className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="relative">
            <button
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-600" />
            </button>
            {isSearchOpen && (
              <div className="absolute right-0 top-10 w-64 bg-white shadow-md rounded-md border border-gray-200 p-4 z-10">
                <InputField
                  placeholder="Cari nama karyawan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
          
          {/* Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-white shadow-md rounded-md border border-gray-200 px-3 py-2"
            >
              <FunnelIcon className="w-5 h-5 text-gray-600" />
              <span>Filter</span>
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white shadow-md rounded-md border border-gray-200 z-10">
                <ul className="text-sm text-gray-700">
                  {FILTER_OPTIONS.map(option => (
                    <li key={option.value}>
                      <button
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          filter === option.value ? "font-bold" : ""
                        }`}
                        onClick={() => {
                            setFilter(option.value as 'all' | Leave['status']);
                          setIsFilterOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Add Leave Button */}
          <Button
            variant="primary"
            onClick={() => router.push('/dashboard/leaves/add')}
            className="flex items-center gap-1 px-1.5 py-2.5 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Ajukan Cuti
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Memuat data cuti...</p>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Tidak ada data cuti yang ditemukan.</p>
          </div>
        ) : (
          <>
            <Table
              columns={COLUMNS}
              data={tableData}
              onSelectionChange={(selected) => {
                const selectedIds = selected.map((index) => paginatedLeaves[index].id!);
                setSelectedLeaves(selectedIds);
              }}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={isConfirmOpen}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus cuti yang dipilih?"
        type="confirm"
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
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
}