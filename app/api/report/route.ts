/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import pool from '@/app/utils/db';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const karyawan_id = parseInt(searchParams.get('karyawan_id') || '0');
  const bulan = parseInt(searchParams.get('bulan') || '0');
  const tahun = parseInt(searchParams.get('tahun') || '0');
  const format = searchParams.get('format')?.toLowerCase() || 'json';
  const scope = searchParams.get('scope')?.toLowerCase() || 'single';

  // Validasi parameter
  if (scope === 'single' && (!karyawan_id || !bulan || !tahun)) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
  } else if (scope === 'all' && (!bulan || !tahun)) {
    return NextResponse.json({ error: 'Bulan dan tahun diperlukan' }, { status: 400 });
  }

  try {
    const reportData: any[] = [];
    let karyawanList: { id: number; nama: string }[] = [];

    // Ambil daftar karyawan jika scope = all
    if (scope === 'all') {
      const [karyawanRows] = await pool.query('SELECT id, nama FROM karyawan');
      karyawanList = karyawanRows as { id: number; nama: string }[];
    } else {
      karyawanList = [{ id: karyawan_id, nama: '' }];
    }

    // Loop untuk setiap karyawan
    for (const karyawan of karyawanList) {
      // 1. Ambil presensi
      const [presensiRows] = await pool.query(
        `SELECT tanggal, status, keterangan
         FROM presensi
         WHERE karyawan_id = ? 
           AND MONTH(tanggal) = ? 
           AND YEAR(tanggal) = ?`,
        [karyawan.id, bulan, tahun]
      );

      // 2. Ambil leave_requests yang disetujui
      const [izinRows] = await pool.query(
        `SELECT tanggal_mulai, tanggal_selesai, jenis, keterangan
         FROM leave_requests
         WHERE karyawan_id = ? AND status = 'approved'
         AND (
           (MONTH(tanggal_mulai) = ? AND YEAR(tanggal_mulai) = ?)
           OR
           (MONTH(tanggal_selesai) = ? AND YEAR(tanggal_selesai) = ?)
         )`,
        [karyawan.id, bulan, tahun, bulan, tahun]
      );

      // 3. Expand range tanggal dari izin
      const izinExpanded: { tanggal: string; status: string; keterangan: string }[] = [];
      for (const item of izinRows as any[]) {
        const start = new Date(item.tanggal_mulai);
        const end = new Date(item.tanggal_selesai);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const tanggal = d.toISOString().split('T')[0];
          izinExpanded.push({
            tanggal,
            status: item.jenis,
            keterangan: item.keterangan
          });
        }
      }

      // 4. Gabungkan (izin dulu, presensi override)
      const byTanggal: Record<string, any> = {};
      izinExpanded.forEach((row) => {
        byTanggal[row.tanggal] = row;
      });
      (presensiRows as any[]).forEach((row) => {
        byTanggal[row.tanggal] = {
          tanggal: row.tanggal instanceof Date
            ? row.tanggal.toISOString().split('T')[0]
            : row.tanggal,
          status: row.status,
          keterangan: row.keterangan
        };
      });

      // 5. Konversi ke array & sort
      const detail = Object.values(byTanggal)
        .filter((row: any) => typeof row.tanggal === 'string')
        .sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));

      // 6. Hitung total
      const total_hadir = detail.filter((d: any) => d.status === 'hadir').length;
      const total_sakit = detail.filter((d: any) => d.status === 'sakit').length;
      const total_izin = detail.filter((d: any) => d.status === 'cuti' || d.status === 'dinas').length;

      reportData.push({
        karyawan_id: karyawan.id,
        karyawan_nama: karyawan.nama,
        total_hadir,
        total_sakit,
        total_izin,
        detail
      });
    }

    // Handle format
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Absensi');

      // Tata letak kolom
      worksheet.columns = [
        { header: 'Karyawan ID', key: 'karyawan_id', width: 15 },
        { header: 'Nama Karyawan', key: 'karyawan_nama', width: 20 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
      ];

      // Tambahkan ringkasan dan detail untuk setiap karyawan
      reportData.forEach((report, index) => {
        // Baris ringkasan
        worksheet.addRow({
          karyawan_id: report.karyawan_id,
          karyawan_nama: report.karyawan_nama,
          tanggal: `Total Bulan ${bulan}/${tahun}`,
          status: '',
          keterangan: `Hadir: ${report.total_hadir}, Sakit: ${report.total_sakit}, Izin: ${report.total_izin}`
        });
        worksheet.addRow({}); // Baris kosong

        // Detail transaksi
        report.detail.forEach((item: any) => {
          worksheet.addRow({
            karyawan_id: report.karyawan_id,
            karyawan_nama: report.karyawan_nama,
            tanggal: item.tanggal,
            status: item.status,
            keterangan: item.keterangan
          });
        });

        if (scope === 'all' && index < reportData.length - 1) {
          worksheet.addRow({}); // Baris kosong antar karyawan
        }
      });

      // Styling ringkasan
      const totalRows = worksheet.rowCount;
      if (totalRows > 0) {
        const rows = worksheet.getRows(1, reportData.length * 2);
        if (rows) {
          rows.forEach((row, i) => {
            if (i % 2 === 0 && row) {
              row.font = { bold: true };
              row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFCCCCCC' }
              };
            }
          });
        }
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=report_${bulan}_${tahun}.xlsx`
        }
      });
    } else if (format === 'pdf') {
      // Tentukan path absolut ke font menggunakan path.resolve
      const fontPath = path.resolve('public/fonts/Merriweather-Italic-VariableFont_opsz,wdth,wght.ttf');

      console.log('Checking font path:', fontPath);

      // Pastikan file font ada
    if (!fs.existsSync(fontPath)) {
  return NextResponse.json({ error: 'Font file tidak ditemukan' }, { status: 500 });
}

      const doc = new PDFDocument({
  margin: 30,
  font: fontPath, // Gunakan font khusus
  info: {
    Title: 'Laporan Absensi',
  }
});
const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));

      // Gunakan font khusus
      try {
  doc.registerFont('Merriweather', fontPath);
  doc.font('Merriweather'); // ✅ SET FONT SEBELUM .text
} catch (fontError) {
  console.error('Gagal memuat font Merriweather:', fontError);
  doc.font('Helvetica'); // fallback
}

      // Tata letak PDF
      doc.fontSize(20).text(`Laporan Absensi Bulan ${bulan}/${tahun}`, { align: 'center' });
      doc.moveDown();

      reportData.forEach((report, index) => {
        if (index > 0) {
          doc.addPage();
        }
        doc.fontSize(16).text(`Karyawan: ${report.karyawan_nama || `ID ${report.karyawan_id}`}`);
        doc.fontSize(12).text(`Total Hadir: ${report.total_hadir}`);
        doc.text(`Total Sakit: ${report.total_sakit}`);
        doc.text(`Total Izin: ${report.total_izin}`);
        doc.moveDown();

        // Tabel header
        doc.fontSize(10);
        const tableTop = doc.y;
        const col1 = 50, col2 = 150, col3 = 250;
        doc.text('Tanggal', col1, tableTop);
        doc.text('Status', col2, tableTop);
        doc.text('Keterangan', col3, tableTop);
        doc.moveDown(0.5);
        doc.lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        // Tabel data
        report.detail.forEach((item: any) => {
          doc.text(item.tanggal, col1, doc.y);
          doc.text(item.status, col2, doc.y);
          doc.text(item.keterangan || '-', col3, doc.y); // Handle null/undefined keterangan
          doc.moveDown(0.5);
        });
      });

      doc.end();

      return new Promise<NextResponse>((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename=report_${bulan}_${tahun}.pdf`
            }
          }));
        });
      });
    }

    // Default: JSON
    return NextResponse.json(scope === 'single' ? reportData[0] : reportData);
  } catch (error) {
    console.error('❌ Gagal mengambil laporan:', error);
    return NextResponse.json({ error: 'Gagal mengambil data', details: (error as Error).message }, { status: 500 });
  }
}