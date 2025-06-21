"use client";

import React, { useState } from 'react';
import Table from '../ui/Table';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';

// Definisikan tipe untuk data presensi
interface PresensiData {
  id: number;
  karyawan_nama: string;
  tanggal: string;
  checkin_time: string;
  checkout_time: string;
  checkin_lokasi: string;
  checkout_lokasi: string;
  status: string;
  keterangan: string;
}

const ReportPage = () => {
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-20');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<number[]>([]); // State untuk melacak baris yang dipilih
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf'); // State untuk memilih format ekspor

  // Dummy data untuk presensi (ganti dengan data dari API)
  const presensiData: PresensiData[] = [
    { id: 1, karyawan_nama: 'John Doe', tanggal: '2025-06-20', checkin_time: '08:00:00', checkout_time: '17:00:00', checkin_lokasi: '-6.123456, 106.789012', checkout_lokasi: '-6.123457, 106.789013', status: 'Aktif', keterangan: '-' },
    { id: 2, karyawan_nama: 'Jane Smith', tanggal: '2025-06-19', checkin_time: '08:15:00', checkout_time: '16:45:00', checkin_lokasi: '-6.123458, 106.789014', checkout_lokasi: '-6.123459, 106.789015', status: 'Aktif', keterangan: 'Telat masuk' },
    { id: 3, karyawan_nama: 'John Doe', tanggal: '2025-06-19', checkin_time: '08:05:00', checkout_time: '17:10:00', checkin_lokasi: '-6.123457, 106.789013', checkout_lokasi: '-6.123458, 106.789014', status: 'Aktif', keterangan: '-' },
    { id: 4, karyawan_nama: 'Jane Smith', tanggal: '2025-06-18', checkin_time: '08:20:00', checkout_time: '16:50:00', checkin_lokasi: '-6.123459, 106.789015', checkout_lokasi: '-6.123460, 106.789016', status: 'Nonaktif', keterangan: 'Izin' },
  ];

  // Filter data berdasarkan tanggal dan status
  const filteredData = presensiData.filter((item) => {
    const itemDate = new Date(item.tanggal);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const matchesDate = itemDate >= start && itemDate <= end;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  // Kelompokkan data per karyawan
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.karyawan_nama]) {
      acc[item.karyawan_nama] = [];
    }
    acc[item.karyawan_nama].push(item);
    return acc;
  }, {} as Record<string, PresensiData[]>);

  const columns = [
    'ID',
    'Nama Karyawan',
    'Tanggal',
    'Check-in',
    'Check-out',
    'Check-in Lokasi',
    'Check-out Lokasi',
    'Status',
    'Keterangan',
  ];

  // Callback untuk menangani perubahan pemilihan baris
  // (dihapus karena tidak digunakan)

  // Fungsi ekspor PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 10;
    Object.entries(groupedData).forEach(([karyawan, data]) => {
      doc.text(`Laporan Presensi - ${karyawan}`, 10, y);
      y += 10;
      autoTable(doc, {
        head: [columns],
        body: data.map((item) => [
          item.id.toString(),
          item.karyawan_nama,
          item.tanggal,
          item.checkin_time,
          item.checkout_time,
          item.checkin_lokasi,
          item.checkout_lokasi,
          item.status,
          item.keterangan,
        ]),
        startY: y,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10; // Pindah ke posisi setelah tabel
    });
    doc.save('laporan-presensi.pdf');
  };

  // Fungsi ekspor Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(groupedData).forEach(([karyawan, data]) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, karyawan);
    });
    XLSX.writeFile(wb, 'laporan-presensi.xlsx');
  };

  // Handler ekspor berdasarkan format
  const handleExport = () => {
    if (exportFormat === 'pdf') {
      exportToPDF();
    } else if (exportFormat === 'excel') {
      exportToExcel();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto rounded-lg">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-4">Laporan Presensi Karyawan</h1>
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Tanggal Selesai</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          >
            <option value="all">Semua</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'excel')}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
          <button
            onClick={handleExport}
            className="mt-6 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={selectedRows.length === 0}
          >
            Ekspor
          </button>
        </div>
      </div>

      {/* Tabel Data untuk Semua Karyawan */}
      {Object.entries(groupedData).map(([karyawan, data]) => (
        <div key={karyawan} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{karyawan}</h2>
          <Table
            columns={columns}
            data={data.map((item) => [
              item.id.toString(),
              item.karyawan_nama,
              item.tanggal,
              item.checkin_time,
              item.checkout_time,
              item.checkin_lokasi,
              item.checkout_lokasi,
              item.status,
              item.keterangan,
            ])}
            onSelectionChange={(indexes) => {
              // Sesuaikan selectedRows berdasarkan tabel spesifik
              const globalIndexes = indexes.map((i) => {
                const offset = presensiData.findIndex((d) => d.id === data[i].id);
                return offset;
              });
              setSelectedRows(globalIndexes);
            }}
          />
        </div>
      ))}

      {/* Pagination (Opsional) - Bisa diterapkan per tabel jika diperlukan */}
      <div className="mt-4 flex justify-end">
        <button className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Previous</button>
        <span className="px-4 py-2">Page 1 of 5</span>
        <button className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Next</button>
      </div>
    </div>
  );
};

export default ReportPage;