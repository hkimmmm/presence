'use client';

import { useEffect, useState } from 'react';

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

  // Ambil daftar karyawan
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

  // Ambil laporan absensi
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

  // Fungsi untuk unduh laporan
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
      a.download = `report_${bulan}_${tahun}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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
    <div className="space-y-4 p-6">
      {/* Header Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-semibold">Laporan Absensi</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilih Scope */}
          <label className="text-sm">Laporan:</label>
          <select
            className="border rounded px-2 py-1"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'single' | 'all')}
          >
            <option value="single">Satu Karyawan</option>
            <option value="all">Semua Karyawan</option>
          </select>

          {/* Dropdown Karyawan (hanya untuk single) */}
          {scope === 'single' && (
            <>
              <label className="text-sm">Pilih Karyawan:</label>
              <select
                className="border rounded px-2 py-1"
                value={selectedKaryawan || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setSelectedKaryawan(isNaN(val) ? null : val);
                }}
              >
                <option value="">-- Pilih --</option>
                {karyawanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Dropdown Bulan */}
          <label className="text-sm">Bulan:</label>
          <select
            className="border rounded px-2 py-1"
            value={bulan}
            onChange={(e) => setBulan(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((bln) => (
              <option key={bln} value={bln}>
                {bln}
              </option>
            ))}
          </select>

          {/* Dropdown Tahun */}
          <label className="text-sm">Tahun:</label>
          <select
            className="border rounded px-2 py-1"
            value={tahun}
            onChange={(e) => setTahun(parseInt(e.target.value))}
          >
            {[2023, 2024, 2025, 2026].map((thn) => (
              <option key={thn} value={thn}>
                {thn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tombol Unduh */}
      <div className="flex gap-2">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          onClick={() => downloadReport('pdf')}
          disabled={scope === 'single' && !selectedKaryawan}
        >
          Unduh PDF
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          onClick={() => downloadReport('excel')}
          disabled={scope === 'single' && !selectedKaryawan}
        >
          Unduh Excel
        </button>
      </div>

      {/* Error handling */}
      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Loading */}
      {loading && <div>Memuat data laporan...</div>}

      {/* Tidak ada data */}
      {!loading && scope === 'single' && selectedKaryawan && !data && !error && (
        <div>Data tidak ditemukan untuk karyawan ini.</div>
      )}

      {/* Ringkasan & Tabel */}
      {data && (
        <>
          {scope === 'single' && !Array.isArray(data) && (
            <>
              {/* Ringkasan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-green-100 p-4 rounded shadow">
                  <p className="text-gray-700">Total Hadir</p>
                  <h3 className="text-xl font-bold text-green-700">{data.total_hadir} Hari</h3>
                </div>
                <div className="bg-yellow-100 p-4 rounded shadow">
                  <p className="text-gray-700">Jumlah Izin</p>
                  <h3 className="text-xl font-bold text-yellow-700">{data.total_izin} Hari</h3>
                </div>
                <div className="bg-red-100 p-4 rounded shadow">
                  <p className="text-gray-700">Jumlah Sakit</p>
                  <h3 className="text-xl font-bold text-red-700">{data.total_sakit} Hari</h3>
                </div>
              </div>

              {/* Tabel Detail */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow rounded-lg">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="py-2 px-4 text-left">Tanggal</th>
                      <th className="py-2 px-4 text-left">Status</th>
                      <th className="py-2 px-4 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detail.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-4">{item.tanggal}</td>
                        <td
                          className={`py-2 px-4 font-semibold ${
                            item.status === 'hadir'
                              ? 'text-green-600'
                              : item.status === 'sakit'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {item.status}
                        </td>
                        <td className="py-2 px-4">{item.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {scope === 'all' && Array.isArray(data) && (
            <>
              {data.map((report, index) => (
                <div key={index} className="mt-6">
                  <h2 className="text-lg font-semibold">
                    Karyawan: {report.karyawan_nama || `ID ${report.karyawan_id}`}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    <div className="bg-green-100 p-4 rounded shadow">
                      <p className="text-gray-700">Total Hadir</p>
                      <h3 className="text-xl font-bold text-green-700">{report.total_hadir} Hari</h3>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded shadow">
                      <p className="text-gray-700">Jumlah Izin</p>
                      <h3 className="text-xl font-bold text-yellow-700">{report.total_izin} Hari</h3>
                    </div>
                    <div className="bg-red-100 p-4 rounded shadow">
                      <p className="text-gray-700">Jumlah Sakit</p>
                      <h3 className="text-xl font-bold text-red-700">{report.total_sakit} Hari</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full bg-white shadow rounded-lg">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="py-2 px-4 text-left">Tanggal</th>
                          <th className="py-2 px-4 text-left">Status</th>
                          <th className="py-2 px-4 text-left">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.detail.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-2 px-4">{item.tanggal}</td>
                            <td
                              className={`py-2 px-4 font-semibold ${
                                item.status === 'hadir'
                                  ? 'text-green-600'
                                  : item.status === 'sakit'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}
                            >
                              {item.status}
                            </td>
                            <td className="py-2 px-4">{item.keterangan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}