/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '@/app/utils/prisma';
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
  const admin_username = searchParams.get('admin_username')?.trim();

  // Validasi parameter
  if (scope === 'single' && (!karyawan_id || !bulan || !tahun)) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
  } else if (scope === 'all' && (!bulan || !tahun)) {
    return NextResponse.json({ error: 'Bulan dan tahun diperlukan' }, { status: 400 });
  }

  try {
    const reportData: any[] = [];
    let karyawanList: { id: number; nama: string }[] = [];

    // Ambil username penyusun (admin)
    let penyusunName = 'Penyusun Tidak Diketahui';
    if (admin_username) {
      console.log(`Received admin_username: "${admin_username}"`);
      const admin = await prisma.users.findFirst({
        where: {
          username: admin_username,
          role: 'admin',
        },
        select: { username: true },
      });
      if (admin) {
        penyusunName = admin.username;
        console.log(`Admin username found: "${penyusunName}"`);
      } else {
        console.warn(`Admin username "${admin_username}" tidak ditemukan atau bukan admin`);
      }
    } else {
      console.warn('No admin_username provided; attempting to fetch any admin');
      const admin = await prisma.users.findFirst({
        where: { role: 'admin' },
        select: { username: true },
      });
      if (admin) {
        penyusunName = admin.username;
        console.log(`Fallback admin username found: "${penyusunName}"`);
      } else {
        console.warn('No admin users found in database');
      }
    }

    // Ambil username supervisor
    let supervisorName = 'Supervisor Tidak Diketahui';
    const supervisor = await prisma.users.findFirst({
      where: { role: 'supervisor' },
      select: { username: true },
    });
    if (supervisor) {
      supervisorName = supervisor.username;
      console.log('Supervisor username:', supervisorName);
    } else {
      console.warn('No supervisor users found in database');
    }

    // Ambil daftar karyawan
    if (scope === 'all') {
      karyawanList = await prisma.karyawan.findMany({
        select: { id: true, nama: true },
      });
    } else {
      const karyawan = await prisma.karyawan.findFirst({
        where: { id: karyawan_id },
        select: { id: true, nama: true },
      });
      if (!karyawan) {
        return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
      }
      karyawanList = [{ id: karyawan.id, nama: karyawan.nama }];
    }

    // Loop untuk setiap karyawan
    for (const karyawan of karyawanList) {
      // 1. Ambil presensi
      const presensiRows = await prisma.presensi.findMany({
        where: {
          karyawan_id: karyawan.id,
          tanggal: {
            gte: new Date(tahun, bulan - 1, 1),
            lte: new Date(tahun, bulan - 1, new Date(tahun, bulan, 0).getDate()),
          },
        },
        select: {
          tanggal: true,
          status: true,
          keterangan: true,
        },
      });
      console.log(`Presensi rows for karyawan_id ${karyawan.id}:`, JSON.stringify(presensiRows, null, 2));

      // 2. Ambil leave_requests yang disetujui
      const izinRows = await prisma.leave_requests.findMany({
        where: {
          karyawan_id: karyawan.id,
          status: 'approved',
          OR: [
            {
              tanggal_mulai: {
                gte: new Date(tahun, bulan - 1, 1),
                lte: new Date(tahun, bulan - 1, new Date(tahun, bulan, 0).getDate()),
              },
            },
            {
              tanggal_selesai: {
                gte: new Date(tahun, bulan - 1, 1),
                lte: new Date(tahun, bulan - 1, new Date(tahun, bulan, 0).getDate()),
              },
            },
          ],
        },
        select: {
          tanggal_mulai: true,
          tanggal_selesai: true,
          jenis: true,
          keterangan: true,
        },
      });
      console.log(`Izin rows for karyawan_id ${karyawan.id}:`, JSON.stringify(izinRows, null, 2));

      // 3. Expand range tanggal dari izin
      const izinExpanded: { tanggal: string; status: string; keterangan: string }[] = [];
      for (const item of izinRows) {
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
      presensiRows.forEach((row) => {
        byTanggal[row.tanggal.toISOString().split('T')[0]] = {
          tanggal: row.tanggal.toISOString().split('T')[0],
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

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Absensi');

      // Header Perusahaan
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = 'CV CITRA BUANA CEMERLANG';
      worksheet.getCell('A1').font = {
        name: 'Calibri',
        size: 18,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002060' },
      };
      worksheet.getCell('A1').alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Judul Laporan
      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = `LAPORAN ABSENSI KARYAWAN - ${monthNames[bulan - 1]} ${tahun}`;
      worksheet.getCell('A2').font = {
        name: 'Calibri',
        size: 14,
        bold: true,
      };
      worksheet.getCell('A2').alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      // Baris kosong
      worksheet.addRow([]);

      // Header Kolom
      worksheet.columns = [
        { header: 'ID Karyawan', key: 'karyawan_id', width: 12 },
        { header: 'Nama Karyawan', key: 'karyawan_nama', width: 25 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Keterangan', key: 'keterangan', width: 30 },
      ];

      const headerRow = worksheet.getRow(4);
      headerRow.values = ['ID Karyawan', 'Nama Karyawan', 'Tanggal', 'Status', 'Keterangan'];
      headerRow.font = {
        name: 'Calibri',
        bold: true,
        size: 11,
        color: { argb: 'FF000000' },
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });

      // Tambahkan data
      reportData.forEach((report, index) => {
        // Baris Total per Karyawan
        const totalRow = worksheet.addRow({
          karyawan_id: report.karyawan_id,
          karyawan_nama: report.karyawan_nama,
          tanggal: '',
          status: `Hadir: ${report.total_hadir} | Sakit: ${report.total_sakit} | Izin: ${report.total_izin}`,
          keterangan: '',
        });

        totalRow.font = {
          name: 'Calibri',
          bold: true,
          size: 10,
        };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        worksheet.mergeCells(`D${totalRow.number}:E${totalRow.number}`);

        // Detail Absensi
        report.detail.forEach((item: any) => {
          const row = worksheet.addRow({
            karyawan_id: '',
            karyawan_nama: '',
            tanggal: item.tanggal,
            status: item.status,
            keterangan: item.keterangan || '-',
          });

          row.font = {
            name: 'Calibri',
            size: 10,
          };

          // Warna berbeda untuk setiap status
          const statusCell = row.getCell(4);
          switch (item.status.toLowerCase()) {
            case 'hadir':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC6EFCE' },
              };
              break;
            case 'izin':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB9C' },
              };
              break;
            case 'sakit':
              statusCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC7CE' },
              };
              break;
          }

          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
          });
        });

        // Baris kosong antar karyawan (khusus laporan semua karyawan)
        if (scope === 'all' && index < reportData.length - 1) {
          worksheet.addRow([]);
        }
      });

      // Tambahkan baris kosong setelah data
      worksheet.addRow([]);

      // Tambahkan bagian tanda tangan
      const dateRowNumber = worksheet.lastRow ? worksheet.lastRow.number + 1 : 1;
      const today = new Date();
      const formattedDate = `Tegal, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      worksheet.mergeCells(`A${dateRowNumber}:E${dateRowNumber}`);
      worksheet.getCell(`A${dateRowNumber}`).value = formattedDate;
      worksheet.getCell(`A${dateRowNumber}`).alignment = { horizontal: 'right' };
      worksheet.getCell(`A${dateRowNumber}`).font = { name: 'Calibri', size: 11 };

      // Baris untuk Penyusun dan Mengetahui
      worksheet.addRow([]);
      const signatureRowNumber = worksheet.lastRow ? worksheet.lastRow.number : dateRowNumber + 1;

      // Penyusun (kiri)
      worksheet.getCell(`A${signatureRowNumber}`).value = 'Penyusun';
      worksheet.getCell(`A${signatureRowNumber}`).font = { name: 'Calibri', size: 11, bold: true };
      worksheet.getCell(`A${signatureRowNumber + 2}`).value = '_________________________';
      worksheet.getCell(`A${signatureRowNumber + 3}`).value = penyusunName;
      worksheet.getCell(`A${signatureRowNumber}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`A${signatureRowNumber + 2}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`A${signatureRowNumber + 3}`).alignment = { horizontal: 'center' };

      // Mengetahui (kanan)
      worksheet.getCell(`E${signatureRowNumber}`).value = 'Mengetahui';
      worksheet.getCell(`E${signatureRowNumber + 1}`).value = 'CV Citra Buana';
      worksheet.getCell(`E${signatureRowNumber + 2}`).value = '_________________________';
      worksheet.getCell(`E${signatureRowNumber + 3}`).value = supervisorName;
      worksheet.getCell(`E${signatureRowNumber}`).font = { name: 'Calibri', size: 11, bold: true };
      worksheet.getCell(`E${signatureRowNumber + 1}`).font = { name: 'Calibri', size: 11, italic: true };
      worksheet.getCell(`E${signatureRowNumber}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`E${signatureRowNumber + 1}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`E${signatureRowNumber + 2}`).alignment = { horizontal: 'center' };
      worksheet.getCell(`E${signatureRowNumber + 3}`).alignment = { horizontal: 'center' };

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=Laporan_Absensi_${monthNames[bulan - 1]}_${tahun}.xlsx`,
        },
      });
    } else if (format === 'pdf') {
      const fontPath = path.resolve('public/fonts/Merriweather-Regular.ttf');
      const logoPath = path.resolve('public/images/citra_buana_cemerlang1.png');

      if (!fs.existsSync(fontPath)) {
        return NextResponse.json({ error: 'Font file tidak ditemukan' }, { status: 500 });
      }
      if (!fs.existsSync(logoPath)) {
        return NextResponse.json({ error: 'Logo file tidak ditemukan' }, { status: 500 });
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

      reportData.forEach((report, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Header dengan logo
        doc.image(logoPath, 50, 20, { width: 50 });
        doc.fontSize(18).fillColor('#2F5496').text('CV Citra Buana Cemerlang', 50, 30, { align: 'center', width: 500 });
        doc.fontSize(14).fillColor('#333333').text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center', width: 500 });
        doc.lineWidth(1).moveTo(50, 80).lineTo(550, 80).stroke();
        doc.moveDown(2);

        // Informasi karyawan
        doc.fontSize(12).fillColor('#333333').text(`Karyawan: ${report.karyawan_nama || `ID: ${report.karyawan_id}`}`, 50, doc.y);
        doc.fontSize(10).text(`Total Hadir: ${report.total_hadir}`, 50, doc.y + 15);
        doc.text(`Total Sakit: ${report.total_sakit}`, 50, doc.y + 10);
        doc.text(`Total Izin: ${report.total_izin}`, 50, doc.y + 10);
        doc.moveDown(2);

        // Header tabel
        const tableTop = doc.y;
        const col1 = 50,
          col2 = 150,
          col3 = 250;
        const rowHeight = 20;

        doc.rect(col1 - 5, tableTop - 5, 500, rowHeight).fill('#2F5496');
        doc
          .fontSize(10)
          .fillColor('#FFFFFF')
          .text('Tanggal', col1, tableTop, { align: 'left', width: 100 })
          .text('Status', col2, tableTop, { align: 'center', width: 100 })
          .text('Keterangan', col3, tableTop, { align: 'left', width: 300 });
        doc.moveDown(1);

        // Tabel isi
        if (report.detail.length === 0) {
          console.log(`No data found for karyawan_id ${report.karyawan_id} in month ${bulan} ${tahun}`);
          doc.text('Tidak ada data absensi untuk periode ini.', col1, doc.y, { width: 500 });
          doc.moveDown(1);
        } else {
          report.detail.forEach((item: any, i: number) => {
            const rowTop = doc.y;

            if (i % 2 === 0) {
              doc.rect(col1 - 5, rowTop - 5, 500, rowHeight).fill('#F5F6F5');
            }

            doc
              .fillColor('#333333')
              .text(item.tanggal || 'Tidak ada', col1, rowTop, { align: 'left', width: 100 })
              .text(item.status || 'Tidak ada', col2, rowTop, { align: 'center', width: 100 })
              .text(item.keterangan || 'Tidak ada', col3, rowTop, { align: 'left', width: 300 });
            doc.moveDown(1);
          });
        }

        // Garis penutup tabel
        doc.lineWidth(0.5).moveTo(col1 - 5, doc.y).lineTo(col1 + col3 + 245, doc.y).stroke();

        // Tambahkan bagian tanda tangan
        const signatureTop = doc.y + 50;
        const today = new Date();
        const formattedDate = `Tegal, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
        doc.fontSize(10).fillColor('#333333').text(formattedDate, 50, signatureTop, { align: 'right', width: 500 });
        doc.moveDown(2);

        // Penyusun (kiri)
        doc.text('Penyusun', 50, doc.y + 20, { align: 'center', width: 200 });
        doc.moveDown(4);
        doc.text('_________________________', 50, doc.y, { align: 'center', width: 200 });
        doc.text(penyusunName, 50, doc.y, { align: 'center', width: 200 });

        // Mengetahui (kanan)
        doc.text('Mengetahui', 350, signatureTop + 40, { align: 'center', width: 200 });
        doc.text('CV Citra Buana', 350, doc.y, { align: 'center', width: 200 });
        doc.moveDown(4);
        doc.text('_________________________', 350, doc.y, { align: 'center', width: 200 });
        doc.text(supervisorName, 350, doc.y, { align: 'center', width: 200 });
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
    console.error('❌ Gagal mengambil laporan:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Gagal mengambil data', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}