'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, DocumentTextIcon, HeartIcon } from '@heroicons/react/24/outline';

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type AbsensiItem = {
  tanggal: string;
  status: string;
  keterangan: string;
};

type LaporanAbsensi = {
  karyawan_id: number;
  karyawan_nama?: string;
  total_hadir: number;
  total_sakit: number;
  total_izin: number;
  detail: AbsensiItem[];
};

type Karyawan = {
  id: number;
  nama: string;
};

interface TokenPayload {
  user_id: number;
  username: string;
  role: string;
  nama: string;
  foto_profile: string | null;
}

export default function LaporanAbsensi() {
  const router = useRouter();
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<number | null>(null);
  const [data, setData] = useState<LaporanAbsensi | LaporanAbsensi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [scope, setScope] = useState<'single' | 'all'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});
  const [modalData, setModalData] = useState<LaporanAbsensi | null>(null);

  useEffect(() => {
    async function fetchUserAndKaryawan() {
      try {
        setLoading(true);
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.message || 'Gagal memuat data pengguna');
        }

        const userData: TokenPayload = await userResponse.json();
        if (!['admin', 'supervisor'].includes(userData.role)) {
          throw new Error('Akses ditolak: Hanya admin atau supervisor yang diizinkan');
        }

        const karyawanResponse = await fetch('/api/employees', {
          method: 'GET',
          credentials: 'include',
        });

        if (!karyawanResponse.ok) {
          const errorData = await karyawanResponse.json();
          throw new Error(errorData.message || 'Gagal memuat daftar karyawan');
        }

        const karyawanData = await karyawanResponse.json();
        setKaryawanList(karyawanData);
      } catch (err) {
        console.error('Gagal memuat data:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat data.');
        router.push('/auth/login?error=invalid_token');
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndKaryawan();
  }, [router]);

  useEffect(() => {
    async function fetchLaporan() {
      if (scope === 'single' && !selectedKaryawan) {
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const userResponse = await fetch('/api/me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.message || 'Gagal memuat data pengguna');
        }

        const userData: TokenPayload = await userResponse.json();
        if (!['admin', 'supervisor'].includes(userData.role)) {
          throw new Error('Akses ditolak: Hanya admin atau supervisor yang diizinkan');
        }

        const url =
          scope === 'single'
            ? `/api/report?karyawan_id=${selectedKaryawan}&bulan=${bulan}&tahun=${tahun}`
            : `/api/report?scope=all&bulan=${bulan}&tahun=${tahun}`;
        const reportResponse = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        });

        if (!reportResponse.ok) {
          const errorText = await reportResponse.text();
          console.error('Fetch error:', reportResponse.status, errorText);
          throw new Error(`Gagal fetch: ${reportResponse.status} ${errorText}`);
        }

        const reportData = await reportResponse.json();
        if (!reportData || (Array.isArray(reportData) && reportData.length === 0)) {
          setError('Tidak ada data absensi untuk periode ini.');
          setData(null);
        } else {
          setData(reportData);
        }
      } catch (err) {
        console.error('Gagal mengambil data laporan:', err);
        setData(null);
        setError(err instanceof Error ? err.message : 'Tidak dapat memuat data laporan.');
        if (err instanceof Error && err.message.includes('401')) {
          router.push('/auth/login?error=invalid_token');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchLaporan();
  }, [selectedKaryawan, bulan, tahun, scope, router]);

  const downloadReport = async (format: 'pdf' | 'excel') => {
    try {
      const userResponse = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || 'Gagal memuat data pengguna');
      }

      const userData: TokenPayload = await userResponse.json();
      if (!['admin', 'supervisor'].includes(userData.role)) {
        throw new Error('Akses ditolak: Hanya admin atau supervisor yang diizinkan');
      }

      const url =
        scope === 'single'
          ? `/api/report?karyawan_id=${selectedKaryawan}&bulan=${bulan}&tahun=${tahun}&format=${format}`
          : `/api/report?scope=all&bulan=${bulan}&tahun=${tahun}&format=${format}`;
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Download error:', res.status, errorText);
        throw new Error(`Gagal mengunduh laporan: ${res.status} ${errorText}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `report_${monthNames[bulan - 1]}_${tahun}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Gagal mengunduh:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengunduh laporan.');
      if (err instanceof Error && err.message.includes('401')) {
        router.push('/auth/login?error=invalid_token');
      }
    }
  };

  const printReport = async () => {
    try {
      const userResponse = await fetch('/api/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || 'Gagal memuat data pengguna');
      }

      const userData: TokenPayload = await userResponse.json();
      if (!['admin', 'supervisor'].includes(userData.role)) {
        throw new Error('Akses ditolak: Hanya admin atau supervisor yang diizinkan');
      }

      const url =
        scope === 'single'
          ? `/api/report?karyawan_id=${selectedKaryawan}&bulan=${bulan}&tahun=${tahun}&format=pdf&print=direct`
          : `/api/report?scope=all&bulan=${bulan}&tahun=${tahun}&format=pdf&print=direct`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      const cleanupIframe = () => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };

      const onAfterPrint = () => {
        cleanupIframe();
        window.removeEventListener('afterprint', onAfterPrint);
      };
      window.addEventListener('afterprint', onAfterPrint);

      iframe.onload = () => {
        try {
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.print();
            } else {
              throw new Error('Jendela iframe tidak tersedia.');
            }
          }, 1500);
        } catch (err) {
          console.error('Gagal mencetak:', err);
          setError('Gagal mencetak laporan.');
          cleanupIframe();
          window.removeEventListener('afterprint', onAfterPrint);
        }
      };

      iframe.onerror = () => {
        setError('Gagal memuat PDF untuk pencetakan.');
        cleanupIframe();
        window.removeEventListener('afterprint', onAfterPrint);
      };
    } catch (err) {
      console.error('Gagal memulai pencetakan:', err);
      setError('Gagal memulai pencetakan.');
      if (err instanceof Error && err.message.includes('401')) {
        router.push('/auth/login?error=invalid_token');
      }
    }
  };

  const toggleSection = (karyawanId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [karyawanId]: !prev[karyawanId],
    }));
  };

  const filteredData = Array.isArray(data)
    ? data.filter(
        (report) =>
          report.karyawan_nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.karyawan_id.toString().includes(searchQuery)
      )
    : data;

  return (
    <div className="container mx-auto p-4 lg:p-6 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Absensi</h1>
        <p className="text-gray-600">Laporan kehadiran karyawan bulan {monthNames[bulan - 1]} {tahun}</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'single' | 'all')}
            >
              <option value="single">Per Karyawan</option>
              <option value="all">Semua Karyawan</option>
            </select>
          </div>

          {scope === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Karyawan</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedKaryawan || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setSelectedKaryawan(isNaN(val) ? null : val);
                }}
              >
                <option value="">-- Pilih Karyawan --</option>
                {karyawanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={bulan}
              onChange={(e) => setBulan(parseInt(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 text-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={tahun}
              onChange={(e) => setTahun(parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((thn) => (
                <option key={thn} value={thn}>
                  {thn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              scope === 'single' && !selectedKaryawan
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            onClick={() => downloadReport('pdf')}
            disabled={scope === 'single' && !selectedKaryawan}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Unduh PDF
          </button>
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              scope === 'single' && !selectedKaryawan
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            onClick={() => downloadReport('excel')}
            disabled={scope === 'single' && !selectedKaryawan}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Unduh Excel
          </button>
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              scope === 'single' && !selectedKaryawan
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            onClick={printReport}
            disabled={scope === 'single' && !selectedKaryawan}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                clipRule="evenodd"
              />
            </svg>
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Search Bar for Scope 'all' */}
      {scope === 'all' && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari karyawan..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error} Silakan coba lagi atau hubungi admin.</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Memuat data...</p>
        </div>
      )}

      {!loading && scope === 'single' && selectedKaryawan && !data && !error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Data tidak ditemukan untuk karyawan ini pada bulan {monthNames[bulan - 1]} {tahun}.</p>
        </div>
      )}

      {!loading && scope === 'all' && Array.isArray(data) && data.length === 0 && !error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Tidak ada data absensi untuk semua karyawan pada bulan {monthNames[bulan - 1]} {tahun}.</p>
        </div>
      )}

      {/* Report Content */}
      {data && (
        <div className="space-y-6">
          {/* Single Employee Report */}
          {scope === 'single' && !Array.isArray(data) && (
            <>
              {/* Summary Cards with Icons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500 flex items-center gap-3">
                  <CheckIcon className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Hadir</h3>
                    <p className="text-2xl font-semibold text-green-600">{data.total_hadir} Hari</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-yellow-500" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Izin</h3>
                    <p className="text-2xl font-semibold text-yellow-600">{data.total_izin} Hari</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500 flex items-center gap-3">
                  <HeartIcon className="h-6 w-6 text-red-500" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Sakit</h3>
                    <p className="text-2xl font-semibold text-red-600">{data.total_sakit} Hari</p>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Keterangan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.detail.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tanggal}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                item.status === 'hadir'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'sakit'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-md">{item.keterangan}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* All Employees Report */}
          {scope === 'all' && Array.isArray(filteredData) && (
            <div>
              {/* Grid Layout for Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {filteredData.map((report) => (
                  <div key={report.karyawan_id} className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">
                      {report.karyawan_nama || `Karyawan ID: ${report.karyawan_id}`}
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-500">Hadir</p>
                          <p className="text-lg font-semibold text-green-600">{report.total_hadir}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-sm text-gray-500">Izin</p>
                          <p className="text-lg font-semibold text-yellow-600">{report.total_izin}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <HeartIcon className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm text-gray-500">Sakit</p>
                          <p className="text-lg font-semibold text-red-600">{report.total_sakit}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      onClick={() => setModalData(report)}
                    >
                      Lihat Detail
                    </button>
                  </div>
                ))}
              </div>

              {/* Collapsible Sections */}
              <div className="space-y-4">
                {filteredData.map((report) => (
                  <div key={report.karyawan_id} className="bg-white rounded-lg shadow overflow-hidden">
                    <button
                      className="w-full px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 hover:bg-gray-100"
                      onClick={() => toggleSection(report.karyawan_id)}
                    >
                      <h2 className="text-lg font-semibold text-gray-800">
                        {report.karyawan_nama || `Karyawan ID: ${report.karyawan_id}`}
                      </h2>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 transition-transform ${expandedSections[report.karyawan_id] ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {expandedSections[report.karyawan_id] && (
                      <div className="overflow-x-auto transition-all duration-300">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tanggal
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Keterangan
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {report.detail.map((item, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tanggal}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      item.status === 'hadir'
                                        ? 'bg-green-100 text-green-800'
                                        : item.status === 'sakit'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-500 max-w-md">{item.keterangan}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for Detail Table */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Detail Absensi: {modalData.karyawan_nama || `Karyawan ID: ${modalData.karyawan_id}`}
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setModalData(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {modalData.detail.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tanggal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'hadir'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'sakit'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-md">{item.keterangan}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}