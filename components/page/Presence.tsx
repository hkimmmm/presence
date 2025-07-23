"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrashIcon, 
  XMarkIcon, 
  CheckIcon, 
  FunnelIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';
import Modal from "@/components/ui/Modal";
import InputField from '@/components/ui/InputField';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';

interface Presence {
  id?: number;
  karyawan_id: number;
  karyawan_nama?: string;
  tanggal: string;
  checkin_time: string;
  checkin_lat?: number | string;
  checkin_lng?: number | string;
  checkout_lat?: number | string;
  checkout_lng?: number | string;
  status: 'hadir' | 'cuti' | 'izin' | 'sakit';
  keterangan?: string;
}

const COLUMNS = [
  'Nama Karyawan',
  'Tanggal',
  'Waktu Check-in',
  'Status',
  'Keterangan',
  'Lokasi Check-in',
  'Lokasi Check-out',
];

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' }
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'hadir', label: 'Hadir' },
  { value: 'cuti', label: 'Cuti' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' }
];

export default function PresencePage() {
  const router = useRouter();
  const [presences, setPresences] = useState<Presence[]>([]);
  const [selectedPresences, setSelectedPresences] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | Presence['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Presence>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Added for error handling

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const fetchPresences = async () => {
      try {
        // Validate role via /api/me
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });
        const userResult = await userResponse.json();

        if (!userResponse.ok || !['admin', 'supervisor'].includes(userResult.role)) {
          throw new Error(userResult.message || 'Akses ditolak: Hanya admin atau supervisor yang diizinkan');
        }

        // Fetch presence data
        const response = await fetch('/api/presence', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal mengambil data presensi');
        }
        
        const data: Presence[] = await response.json();
        setPresences(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(error instanceof Error ? error.message : 'Gagal memuat data presensi');
        router.push('/auth/login?error=invalid_token');
      } finally {
        setLoading(false);
      }
    };

    fetchPresences();
  }, [router]);

  const filteredPresences = presences.filter((presence) => {
    const matchesFilter = filter === 'all' || presence.status === filter;
    const matchesSearch =
      presence.keterangan?.toLowerCase().includes(search.toLowerCase()) ||
      presence.karyawan_nama?.toLowerCase().includes(search.toLowerCase()) ||
      presence.status.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPresences.length / ITEMS_PER_PAGE);
  const paginatedPresences = filteredPresences.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startEditing = (id: number) => {
    const presenceToEdit = presences.find(presence => presence.id === id);
    if (presenceToEdit) {
      setEditingId(id);
      setEditData({ ...presenceToEdit });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof Presence, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveEditing = async (id: number) => {
    try {
      const response = await fetch(`/api/presence`, {
        method: "PUT",
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, ...editData }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Gagal memperbarui data presensi");
      }

      setPresences(prev =>
        prev.map(presence => (presence.id === id ? { ...presence, ...editData } : presence))
      );
      setEditingId(null);
      setEditData({});
      setIsSuccessOpen(true);
    } catch (err) {
      console.error("Error updating presence:", err);
      setErrorMessage(err instanceof Error ? err.message : "Gagal memperbarui data presensi");
    }
  };

  const handleRowDoubleClick = (id: number) => {
    startEditing(id);
  };

  const confirmDelete = () => setIsConfirmOpen(true);

  const handleDelete = async () => {
    try {
      const response = await fetch('/api/presence', {
        method: 'DELETE',
        credentials: 'include', // Include cookies
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedPresences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus presensi');
      }

      setPresences(presences.filter((presence) => !selectedPresences.includes(presence.id!)));
      setSelectedPresences([]);
      setIsConfirmOpen(false);
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error deleting presences:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus presensi');
    }
  };

  const renderStatusCell = (presence: Presence) => {
    if (editingId === presence.id) {
      return (
        <div className="flex items-center gap-2 min-w-[180px]">
          <select
            value={editData.status || "hadir"}
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
            onClick={() => saveEditing(presence.id!)}
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
      hadir: 'text-green-700 bg-green-100',
      cuti: 'text-blue-700 bg-blue-100',
      izin: 'text-yellow-700 bg-yellow-100',
      sakit: 'text-red-600 bg-red-100'
    };

    return (
      <div 
        onDoubleClick={() => handleRowDoubleClick(presence.id!)}
        className="min-w-[120px]"
      >
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            statusStyles[presence.status as keyof typeof statusStyles] || statusStyles.hadir
          }`}
        >
          {presence.status || 'hadir'}
        </span>
      </div>
    );
  };

  const renderNoteCell = (presence: Presence) => {
    if (editingId === presence.id) {
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
        onDoubleClick={() => handleRowDoubleClick(presence.id!)}
        className="w-[120px] truncate overflow-hidden text-ellipsis"
        title={presence.keterangan || ''}
      >
        {presence.keterangan || '-'}
      </div>
    );
  };

  const renderCheckinLocationCell = (presence: Presence) => {
    const checkinLat = presence.checkin_lat != null ? Number(presence.checkin_lat) : null;
    const checkinLng = presence.checkin_lng != null ? Number(presence.checkin_lng) : null;
    const isCheckinValid = checkinLat != null && !isNaN(checkinLat) && checkinLng != null && !isNaN(checkinLng);
    
    const checkinText = isCheckinValid 
      ? `Lat ${checkinLat.toFixed(4)}, Lng ${checkinLng.toFixed(4)}`
      : '-';
    
    return (
      <div 
        className="w-[150px] truncate overflow-hidden text-ellipsis"
        title={checkinText}
      >
        {checkinText}
      </div>
    );
  };

  const renderCheckoutLocationCell = (presence: Presence) => {
    const checkoutLat = presence.checkout_lat != null ? Number(presence.checkout_lat) : null;
    const checkoutLng = presence.checkout_lng != null ? Number(presence.checkout_lng) : null;
    const isCheckoutValid = checkoutLat != null && !isNaN(checkoutLat) && checkoutLng != null && !isNaN(checkoutLng);
    
    const checkoutText = isCheckoutValid 
      ? `Lat ${checkoutLat.toFixed(4)}, Lng ${checkoutLng.toFixed(4)}`
      : '-';
    
    return (
      <div 
        className="w-[150px] truncate overflow-hidden text-ellipsis"
        title={checkoutText}
      >
        {checkoutText}
      </div>
    );
  };

  const tableData = paginatedPresences.map((presence) => [
    presence.karyawan_nama || '-',
    new Date(presence.tanggal).toLocaleDateString('id-ID'),
    new Date(presence.checkin_time).toLocaleTimeString('id-ID'),
    renderStatusCell(presence),
    renderNoteCell(presence),
    renderCheckinLocationCell(presence),
    renderCheckoutLocationCell(presence),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-black">Daftar Kehadiran</h1>
        
        <div className="flex items-center gap-4">
          {/* Delete Button */}
          <button
            className={`p-2 rounded-md flex items-center ${
              selectedPresences.length > 0
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={selectedPresences.length === 0}
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
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
            >
              <FunnelIcon className="w-5 h-5 text-gray-600" />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white shadow-md rounded-md border border-gray-200">
                <ul className="text-sm text-gray-700">
                  {FILTER_OPTIONS.map(option => (
                    <li key={option.value}>
                      <button
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          filter === option.value ? "font-bold" : ""
                        }`}
                        onClick={() => {
                          setFilter(option.value as 'all' | Presence['status']);
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

        </div>
      </div>

      {/* Table Content */}
      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Memuat data presensi...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-red-500">{errorMessage}</p>
          </div>
        ) : filteredPresences.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Tidak ada data presensi yang ditemukan.</p>
          </div>
        ) : (
          <>
            <Table
              columns={COLUMNS}
              data={tableData}
              onSelectionChange={(selected) => {
                const selectedIds = selected.map((index) => paginatedPresences[index].id!);
                setSelectedPresences(selectedIds);
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
        message="Apakah Anda yakin ingin menghapus presensi yang dipilih?"
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

      <Modal
        isOpen={!!errorMessage}
        title="Error"
        message={errorMessage || 'Terjadi kesalahan'}
        onClose={() => setErrorMessage(null)}
      />
    </div>
  );
}