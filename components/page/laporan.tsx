'use client';

import { useEffect, useState } from 'react';

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
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

export default function LaporanAbsensi() {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<number | null>(null);
  const [data, setData] = useState<LaporanAbsensi | LaporanAbsensi[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [scope, setScope] = useState<'single' | 'all'>('single');

  useEffect(() => {
    async function fetchKaryawan() {
      try {
        const res = await fetch('/api/employees');
        const json = await res.json();
        setKaryawanList(json);
      } catch (err) {
        console.error('Gagal memuat karyawan:', err);
        setError('Gagal memuat daftar karyawan.');
      }
    }

    fetchKaryawan();
  }, []);

  useEffect(() => {
    if (scope === 'single' && !selectedKaryawan) return;

    async function fetchLaporan() {
      setLoading(true);
      setError(null);
      try {
        const url =
          scope === 'single'
            ? `/api/report?karyawan_id=${selectedKaryawan}&bulan=${bulan}&tahun=${tahun}`
            : `/api/report?scope=all&bulan=${bulan}&tahun=${tahun}`;
        const res = await fetch(url);

        if (!res.ok) throw new Error('Gagal fetch');

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Gagal mengambil data laporan:', err);
        setData(null);
        setError('Tidak dapat memuat data laporan.');
      } finally {
        setLoading(false);
      }
    }

    fetchLaporan();
  }, [selectedKaryawan, bulan, tahun, scope]);

  const downloadReport = async (format: 'pdf' | 'excel') => {
    try {
      const url =
        scope === 'single'
          ? `/api/report?karyawan_id=${selectedKaryawan}&bulan=${bulan}&tahun=${tahun}&format=${format}`
          : `/api/report?scope=all&bulan=${bulan}&tahun=${tahun}&format=${format}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error('Gagal mengunduh laporan');

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
      setError('Gagal mengunduh laporan.');
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Absensi</h1>
        <p className="text-gray-600">Laporan kehadiran karyawan bulan {monthNames[bulan - 1]} {tahun}</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scope Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'single' | 'all')}
            >
              <option value="single">Per Karyawan</option>
              <option value="all">Semua Karyawan</option>
            </select>
          </div>

          {/* Employee Selector (only for single) */}
          {scope === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Karyawan</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {/* Year Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

        {/* Download Buttons */}
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
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
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
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Unduh Excel
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && scope === 'single' && selectedKaryawan && !data && !error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Data tidak ditemukan untuk karyawan ini.</p>
        </div>
      )}

      {/* Report Content */}
      {data && (
        <div className="space-y-6">
          {/* Single Employee Report */}
          {scope === 'single' && !Array.isArray(data) && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <h3 className="text-sm font-medium text-gray-500">Total Hadir</h3>
                  <p className="text-2xl font-semibold text-green-600">{data.total_hadir} Hari</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <h3 className="text-sm font-medium text-gray-500">Total Izin</h3>
                  <p className="text-2xl font-semibold text-yellow-600">{data.total_izin} Hari</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <h3 className="text-sm font-medium text-gray-500">Total Sakit</h3>
                  <p className="text-2xl font-semibold text-red-600">{data.total_sakit} Hari</p>
                </div>
              </div>

              {/* Detail Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      {data.detail.map((item, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.tanggal}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.status === 'hadir'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'sakit'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {item.keterangan}
                            </div>
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
          {scope === 'all' && Array.isArray(data) && (
            <div className="space-y-6">
              {data.map((report, index) => (
                <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {report.karyawan_nama || `Karyawan ID: ${report.karyawan_id}`}
                    </h2>
                  </div>
                  
                  {/* Summary for each employee */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Hadir</h3>
                      <p className="text-xl font-semibold text-green-600">{report.total_hadir} Hari</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Izin</h3>
                      <p className="text-xl font-semibold text-yellow-600">{report.total_izin} Hari</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Sakit</h3>
                      <p className="text-xl font-semibold text-red-600">{report.total_sakit} Hari</p>
                    </div>
                  </div>

                  {/* Detail table for each employee */}
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
                        {report.detail.map((item, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.tanggal}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.status === 'hadir'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'sakit'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.keterangan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}