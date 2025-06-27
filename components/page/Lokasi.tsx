"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, XMarkIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';
import InputField from '@/components/ui/InputField';
import Table from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';

interface LokasiKantor {
  id?: number;
  nama_kantor: string;
  latitude: string | number;
  longitude: string | number;
  radius_meter: number;
  created_at?: string;
  updated_at?: string;
}

const COLUMNS = [
  'Nama Kantor',
  'Latitude',
  'Longitude',
  'Radius (Meter)',
  'Created At',
  'Updated At',
];

export default function OfficeLocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<LokasiKantor[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<LokasiKantor>>({});

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
        });
        const userResult = await userResponse.json();

        if (!userResponse.ok || userResult.role !== 'admin') {
          throw new Error(userResult.message || 'Access denied: Admin only');
        }

        const response = await fetch('/api/lokasi', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal mengambil data lokasi kantor');
        }

        const data: LokasiKantor[] = await response.json();
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Gagal mengambil data lokasi kantor');
        router.push('/auth/login?error=invalid_token');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [router]);

  const filteredLocations = locations.filter((location) =>
    location.nama_kantor.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);
  const paginatedLocations = filteredLocations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startEditing = (id: number) => {
    const locationToEdit = locations.find((location) => location.id === id);
    if (locationToEdit) {
      setEditingId(id);
      setEditData({ ...locationToEdit });
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field: keyof LokasiKantor, value: string) => {
  setEditData((prev) => ({
    ...prev,
    [field]: field === 'radius_meter' ? parseInt(value, 10) || 0 : value,
  }));
};

  const saveEditing = async (id: number) => {
    try {
      const { nama_kantor, latitude, longitude, radius_meter } = editData;
      if (!nama_kantor || latitude === undefined || longitude === undefined || radius_meter === undefined) {
        throw new Error('Semua field wajib diisi');
      }

      const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
      const lon = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Latitude harus antara -90 dan 90');
      }
      if (isNaN(lon) || lon < -180 || lon > 180) {
        throw new Error('Longitude harus antara -180 dan 180');
      }
      if (isNaN(radius_meter) || radius_meter <= 0 || !Number.isInteger(radius_meter)) {
          throw new Error('Radius harus berupa angka bulat positif');
      }

      const response = await fetch(`/api/lokasi`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, nama_kantor, latitude: lat, longitude: lon, radius_meter }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Gagal memperbarui data lokasi kantor');
      }

      setLocations((prev) =>
        prev.map((location) =>
          location.id === id ? { ...location, nama_kantor, latitude: lat, longitude: lon, radius_meter } : location
        )
      );
      setEditingId(null);
      setEditData({});
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error updating location:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memperbarui data lokasi kantor');
    }
  };

  const handleRowDoubleClick = (id: number) => {
    startEditing(id);
  };

  const confirmDelete = () => setIsConfirmOpen(true);

  const handleDelete = async () => {
    try {
      for (const id of selectedLocations) {
        const response = await fetch('/api/lokasi_kantor', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || 'Gagal menghapus data lokasi kantor');
        }
      }

      setLocations(locations.filter((location) => !selectedLocations.includes(location.id!)));
      setSelectedLocations([]);
      setIsConfirmOpen(false);
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error deleting locations:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Gagal menghapus data lokasi kantor');
    }
  };

  const renderEditableCell = (location: LokasiKantor, field: keyof LokasiKantor, displayValue: string | number) => {
    if (editingId === location.id) {
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <InputField
            value={editData[field] !== undefined ? String(editData[field]) : String(displayValue)}
            onChange={(e) => handleEditChange(field, e.target.value)}
            type={field === 'nama_kantor' ? 'text' : 'text'} // Use text to allow decimal input
            className="w-full max-w-[120px]"
          />
          {field === 'nama_kantor' && (
            <>
              <button
                onClick={() => saveEditing(location.id!)}
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
            </>
          )}
        </div>
      );
    }
    return (
      <div
        onDoubleClick={() => handleRowDoubleClick(location.id!)}
        className="min-w-[100px] max-w-[150px] truncate"
      >
        {typeof displayValue === 'number' ? displayValue.toFixed(12) : displayValue}
      </div>
    );
  };

  const tableData = paginatedLocations.map((location) => [
    renderEditableCell(location, 'nama_kantor', location.nama_kantor),
    renderEditableCell(location, 'latitude', typeof location.latitude === 'number' ? location.latitude.toFixed(12) : location.latitude),
    renderEditableCell(location, 'longitude', typeof location.longitude === 'number' ? location.longitude.toFixed(12) : location.longitude),
    renderEditableCell(location, 'radius_meter', location.radius_meter),
    location.created_at ? new Date(location.created_at).toLocaleString() : '-',
    location.updated_at ? new Date(location.updated_at).toLocaleString() : '-',
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Lokasi Kantor</h1>
        <div className="flex items-center gap-4">
          <button
            className={`p-2 rounded-md flex items-center ${
              selectedLocations.length > 0
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            disabled={selectedLocations.length === 0}
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
              <div className="absolute right-0 top-10 w-64 bg-white shadow-md rounded-md border border-gray-200 p-4 z-10">
                <InputField
                  placeholder="Cari nama kantor..."
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
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p>Memuat data lokasi kantor...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Tidak ada data lokasi kantor yang ditemukan.</p>
          </div>
        ) : (
          <>
            <Table
              columns={COLUMNS}
              data={tableData}
              onSelectionChange={(selected) => {
                const selectedIds = selected.map((index) => paginatedLocations[index].id!);
                setSelectedLocations(selectedIds);
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
      <Modal
        isOpen={isConfirmOpen}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus lokasi kantor yang dipilih?"
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