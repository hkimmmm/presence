/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import pool from '@/app/utils/db';
import fs from 'fs';
import path from 'path';

// Array untuk mapping bulan ke nama bulan dalam bahasa Indonesia
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const karyawan_id = parseInt(searchParams.get('karyawan_id') || '0');
  const bulan = parseInt(searchParams.get('bulan') || '0');
  const tahun = parseInt(searchParams.get('tahun') || '0');
  const format = searchParams.get('format')?.toLowerCase() || 'json';
  const scope = searchParams.get('scope')?.toLowerCase() || 'single';
  const print = searchParams.get('print')?.toLowerCase() === 'direct';

  // Validasi parameter
  if (scope === 'single' && (!karyawan_id || !bulan || !tahun)) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
  } else if (scope === 'all' && (!bulan || !tahun)) {
    return NextResponse.json({ error: 'Bulan dan tahun diperlukan' }, { status: 400 });
  }

  try {
    const reportData: any[] = [];
    let karyawanList: { id: number; nama: string }[] = [];

    // Ambil daftar karyawan
    if (scope === 'all') {
      const [karyawanRows] = await pool.query('SELECT id, nama FROM karyawan');
      karyawanList = karyawanRows as { id: number; nama: string }[];
    } else {
      const [karyawanRows] = await pool.query('SELECT id, nama FROM karyawan WHERE id = ?', [karyawan_id]);
      const karyawan = (karyawanRows as { id: number; nama: string }[])[0];
      if (!karyawan) {
        return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
      }
      karyawanList = [{ id: karyawan.id, nama: karyawan.nama }];
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
      console.log(`Presensi rows for karyawan_id ${karyawan.id}:`, JSON.stringify(presensiRows, null, 2));

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
      console.log(`Izin rows for karyawan_id ${karyawan.id}:`, JSON.stringify(izinRows, null, 2));

      // 3. Expand range tanggal dari izin
      const izinExpanded: { tanggal: string; status: string; keterangan: string }[] = [];
      for (const item of izinRows as any[]) {
        const start = new Date(item.tanggal_mulai);
        const end = new Date(item.tanggal_selesai);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const tanggal = d.toISOString().split('T')[0];
          izinExpanded.push({
            tanggal,
            status: item.jenis || 'izin',
            keterangan: item.keterangan || '-',
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
          tanggal: row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : row.tanggal,
          status: row.status || '-',
          keterangan: row.keterangan || '-',
        };
      });

      // 5. Konversi ke array & sort
      const detail = Object.values(byTanggal)
        .filter((row: any) => typeof row.tanggal === 'string')
        .sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));
      console.log(`Detail for karyawan_id ${karyawan.id}:`, JSON.stringify(detail, null, 2));

      // 6. Hitung total
      const total_hadir = detail.filter((d: any) => d.status === 'hadir').length;
      const total_sakit = detail.filter((d: any) => d.status === 'sakit').length;
      const total_izin = detail.filter((d: any) => d.status === 'cuti' || d.status === 'dinas' || d.status === 'izin').length;

      reportData.push({
        karyawan_id: karyawan.id,
        karyawan_nama: karyawan.nama,
        total_hadir,
        total_sakit,
        total_izin,
        detail,
      });
    }

    // Handle format
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Absensi');

      // Tambahkan header perusahaan
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = 'CV Citra Buana Cemerlang';
      worksheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true };
      worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' },
      };
      worksheet.getCell('A1').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = `Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`;
      worksheet.getCell('A2').font = { name: 'Arial', size: 12, bold: true };
      worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.addRow([]); // Baris kosong

      // Definisikan kolom
      worksheet.columns = [
        { header: 'Karyawan ID', key: 'karyawan_id', width: 15 },
        { header: 'Nama Karyawan', key: 'karyawan_nama', width: 25 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
      ];

      // Style header kolom
      worksheet.getRow(4).font = { name: 'Arial', bold: true, size: 11 };
      worksheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EDF7' },
      };
      worksheet.getRow(4).alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(4).eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Tambahkan data
      reportData.forEach((report, index) => {
        worksheet.addRow({
          karyawan_id: report.karyawan_id,
          karyawan_nama: report.karyawan_nama,
          tanggal: `Total Bulan ${monthNames[bulan - 1]}/${tahun}`,
          status: '',
          keterangan: `Hadir: ${report.total_hadir}, Sakit: ${report.total_sakit}, Izin: ${report.total_izin}`,
        }).font = { name: 'Arial', bold: true, size: 11 };

        worksheet.addRow({}); // Baris kosong

        report.detail.forEach((item: any) => {
          const row = worksheet.addRow({
            karyawan_id: report.karyawan_id,
            karyawan_nama: report.karyawan_nama,
            tanggal: item.tanggal,
            status: item.status,
            keterangan: item.keterangan || '-',
          });
          row.font = { name: 'Arial', size: 10 };
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        });

        if (scope === 'all' && index < reportData.length - 1) {
          worksheet.addRow({});
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=report_${monthNames[bulan - 1]}_${tahun}.xlsx`,
        },
      });
    } else if (format === 'pdf') {
      const fontPath = path.resolve('public/fonts/Merriweather-Regular.ttf');

      if (!fs.existsSync(fontPath)) {
        return NextResponse.json({ error: 'Font file tidak ditemukan' }, { status: 500 });
      }

      const doc = new PDFDocument({
        margin: 40,
        font: fontPath,
        info: { Title: 'Laporan Absensi CV Citra Buana Cemerlang' },
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));

      try {
        doc.registerFont('Merriweather', fontPath);
        doc.font('Merriweather');
      } catch (fontError) {
        console.error('Gagal memuat font Merriweather:', fontError);
        doc.font('Helvetica');
      }

      // Header perusahaan
      doc.fontSize(18).fillColor('#2F5496').text('CV Citra Buana Cemerlang', 50, 30, { align: 'center' });
      doc.fontSize(14).fillColor('#333333').text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center' });
      doc.lineWidth(1).moveTo(50, 70).lineTo(550, 70).stroke();
      doc.moveDown(2);

      reportData.forEach((report, index) => {
        if (index > 0) {
          doc.addPage();
          // Repeat header on new page
          doc.fontSize(18).fillColor('#2F5496').text('CV Citra Buana Cemerlang', 50, 30, { align: 'center' });
          doc.fontSize(14).fillColor('#333333').text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center' });
          doc.lineWidth(1).moveTo(50, 70).lineTo(550, 70).stroke();
          doc.moveDown(2);
        }

        // Informasi karyawan
        doc.fontSize(12).fillColor('#333333').text(`Karyawan: ${report.karyawan_nama || `ID: ${report.karyawan_id}`}`, 50, doc.y);
        doc.fontSize(10).text(`Total Hadir: ${report.total_hadir}`, 50, doc.y + 15);
        doc.text(`Total Sakit: ${report.total_sakit}`, 50, doc.y + 10);
        doc.text(`Total Izin: ${report.total_izin}`, 50, doc.y + 10);
        doc.moveDown(2);

        // Header tabel
        const tableTop = doc.y;
        const col1 = 50, col2 = 150, col3 = 250;
        doc.fontSize(10).fillColor('#FFFFFF').font('Merriweather').rect(col1 - 5, tableTop - 5, 500, 20).fill('#2F5496');
        doc.text('Tanggal', col1, tableTop, { align: 'left', width: 100 });
        doc.text('Status', col2, tableTop, { align: 'center', width: 100 });
        doc.text('Keterangan', col3, tableTop, { align: 'left', width: 300 });
        doc.moveDown(1); // Tingkatkan jarak setelah header

        // Tabel isi with debug
        if (report.detail.length === 0) {
          console.log(`No data found for karyawan_id ${report.karyawan_id} in month ${bulan} ${tahun}`);
          doc.text('Tidak ada data absensi untuk periode ini.', col1, doc.y, { width: 500 });
          doc.moveDown(1);
        } else {
          report.detail.forEach((item: any, i: number) => {
            const rowTop = doc.y;
            doc.fillColor('#333333');
            if (i % 2 === 0) {
              doc.rect(col1 - 5, rowTop - 5, 500, 20).fill('#F5F6F5');
              doc.fillColor('#333333');
            }
            console.log(`Rendering item for karyawan_id ${report.karyawan_id}:`, JSON.stringify(item, null, 2)); // Debug log
            doc.text(item.tanggal || 'Tidak ada', col1, rowTop, { align: 'left', width: 100 });
            doc.text(item.status || 'Tidak ada', col2, rowTop, { align: 'center', width: 100 });
            doc.text(item.keterangan || 'Tidak ada', col3, rowTop, { align: 'left', width: 300 });
            doc.moveDown(1); // Tingkatkan jarak antar baris
          });
        }

        // Garis penutup tabel
        doc.lineWidth(0.5).moveTo(col1 - 5, doc.y).lineTo(col1 + col3 + 245, doc.y).stroke();
      });

      doc.end();

      return new Promise<NextResponse>((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          if (print) {
            resolve(
              new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': `inline; filename=report_${monthNames[bulan - 1]}_${tahun}.pdf`,
                },
              })
            );
          } else {
            resolve(
              new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': `attachment; filename=report_${monthNames[bulan - 1]}_${tahun}.pdf`,
                },
              })
            );
          }
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