/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { prisma } from '@/app/utils/prisma';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'https://app.citrabuana.online',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const karyawan_id = parseInt(searchParams.get('karyawan_id') || '0');
  const bulan = parseInt(searchParams.get('bulan') || '0');
  const tahun = parseInt(searchParams.get('tahun') || '0');
  const format = searchParams.get('format')?.toLowerCase() || 'json';
  const scope = searchParams.get('scope')?.toLowerCase() || 'single';
  const print = searchParams.get('print')?.toLowerCase() === 'direct';

  console.log('Parameter diterima:', { karyawan_id, bulan, tahun, format, scope, print });
  console.log('Cookies received:', req.cookies.getAll());

  // Validasi parameter
  if (scope === 'single' && (!karyawan_id || !bulan || !tahun)) {
    console.error('Validasi parameter gagal:', { karyawan_id, bulan, tahun });
    return NextResponse.json({ error: 'Parameter wajib tidak lengkap' }, { status: 400, headers: corsHeaders() });
  } else if (scope === 'all' && (!bulan || !tahun)) {
    console.error('Validasi parameter gagal:', { bulan, tahun });
    return NextResponse.json({ error: 'Bulan dan tahun wajib diisi' }, { status: 400, headers: corsHeaders() });
  }

  // Verifikasi token dari cookie
  const token = req.cookies.get('token')?.value;
  if (!token) {
    console.error('Token tidak ditemukan di cookie');
    return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401, headers: corsHeaders() });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secure_jwt_secret') as { role: string };
    console.log('Token decoded:', decoded);
    if (!['admin', 'supervisor'].includes(decoded.role)) {
      console.error('Akses ditolak: Peran tidak diizinkan', { role: decoded.role });
      return NextResponse.json({ error: 'Akses ditolak: Hanya admin atau supervisor yang diizinkan' }, { status: 403, headers: corsHeaders() });
    }

    try {
      await prisma.$connect();
      console.log('Database terhubung');
      const dbVersion = await prisma.$queryRaw`SELECT VERSION()`;
      console.log('Versi MariaDB:', dbVersion);

      const reportData: any[] = [];
      let karyawanList: { id: number; nama: string }[] = [];

      if (scope === 'all') {
        karyawanList = await prisma.karyawan.findMany({
          select: { id: true, nama: true },
          take: 100,
        });
        console.log('Jumlah karyawan ditemukan:', karyawanList.length);
      } else {
        const karyawan = await prisma.karyawan.findFirst({
          where: { id: karyawan_id },
          select: { id: true, nama: true },
        });
        if (!karyawan) {
          console.error('Karyawan tidak ditemukan:', karyawan_id);
          return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404, headers: corsHeaders() });
        }
        karyawanList = [{ id: karyawan.id, nama: karyawan.nama }];
      }

      for (const karyawan of karyawanList) {
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
          },
        });
        console.log(`Presensi untuk karyawan_id ${karyawan.id}:`, JSON.stringify(presensiRows, null, 2));

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
          },
        });
        console.log(`Izin untuk karyawan_id ${karyawan.id}:`, JSON.stringify(izinRows, null, 2));

        const izinExpanded: { tanggal: string; status: string }[] = [];
        for (const item of izinRows) {
          const start = new Date(item.tanggal_mulai);
          const end = new Date(item.tanggal_selesai);

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const tanggal = d.toISOString().split('T')[0];
            izinExpanded.push({
              tanggal,
              status: item.jenis || 'izin',
            });
          }
        }

        // Generate data for all days in the month
        const daysInMonth = new Date(tahun, bulan, 0).getDate();
        const byTanggal: Record<string, { tanggal: string; status: string }> = {};
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(tahun, bulan - 1, day).toISOString().split('T')[0];
          byTanggal[date] = { tanggal: date, status: '-' };
        }

        izinExpanded.forEach((row) => {
          byTanggal[row.tanggal] = { tanggal: row.tanggal, status: row.status };
        });
        presensiRows.forEach((row) => {
          byTanggal[row.tanggal.toISOString().split('T')[0]] = {
            tanggal: row.tanggal.toISOString().split('T')[0],
            status: row.status || '-',
          };
        });

        const detail = Object.values(byTanggal).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        console.log(`Detail untuk karyawan_id ${karyawan.id}:`, JSON.stringify(detail, null, 2));

        const total_hadir = detail.filter((d) => d.status === 'hadir').length;
        const total_sakit = detail.filter((d) => d.status === 'sakit').length;
        const total_izin = detail.filter((d) => d.status === 'cuti' || d.status === 'dinas' || d.status === 'izin').length;

        reportData.push({
          karyawan_id: karyawan.id,
          karyawan_nama: karyawan.nama,
          total_hadir,
          total_sakit,
          total_izin,
          detail,
        });
      }

      if (reportData.length === 0) {
        console.log('Tidak ada data laporan untuk periode ini');
        return NextResponse.json([], { status: 200, headers: corsHeaders() });
      }

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Absensi');

        // Header
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'CV CITRA BUANA CEMERLANG';
        worksheet.getCell('A1').font = {
          name: 'Times New Roman',
          size: 16,
          bold: true,
          color: { argb: 'FF000000' },
        };
        worksheet.getCell('A1').alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };

        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = `LAPORAN ABSENSI BULAN ${monthNames[bulan - 1].toUpperCase()} ${tahun}`;
        worksheet.getCell('A2').font = {
          name: 'Times New Roman',
          size: 14,
          bold: true,
          color: { argb: 'FF000000' },
        };
        worksheet.getCell('A2').alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };

        worksheet.addRow([]);

        reportData.forEach((report, index) => {
          // Employee Info
          worksheet.addRow(['Karyawan:', report.karyawan_nama || `ID: ${report.karyawan_id}`]);
          if (worksheet.lastRow) {
            worksheet.getCell(`A${worksheet.lastRow.number}`).font = {
              name: 'Times New Roman',
              size: 12,
              bold: true,
              color: { argb: 'FF000000' },
            };
          }

          // Table Headers
          worksheet.addRow(['No', 'Tanggal', 'Status', '', 'No', 'Tanggal', 'Status']);
          const headerRow = worksheet.lastRow;
          if (headerRow) {
            headerRow.font = {
              name: 'Times New Roman',
              size: 12,
              bold: true,
              color: { argb: 'FF000000' },
            };
            headerRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD3D3D3' },
            };
            headerRow.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
              };
            });
          }

          // Set column widths
          worksheet.columns = [
            { key: 'no1', width: 5 },
            { key: 'tanggal1', width: 15 },
            { key: 'status1', width: 10 },
            { key: 'spacer', width: 5 },
            { key: 'no2', width: 5 },
            { key: 'tanggal2', width: 15 },
            { key: 'status2', width: 10 },
          ];

          // Split detail into two columns (1-15 and 16-31)
          const leftColumn = report.detail.slice(0, 15);
          const rightColumn = report.detail.slice(15, 31);
          const maxRows = Math.max(leftColumn.length, rightColumn.length);

          for (let i = 0; i < maxRows; i++) {
            const left = leftColumn[i] || { tanggal: '-', status: '-' };
            const right = rightColumn[i] || { tanggal: '-', status: '-' };
            const row = worksheet.addRow([
              leftColumn[i] ? i + 1 : '',
              left.tanggal,
              left.status,
              '',
              rightColumn[i] ? i + 16 : '',
              right.tanggal,
              right.status,
            ]);
            row.font = {
              name: 'Times New Roman',
              size: 12,
              color: { argb: 'FF000000' },
            };
            row.eachCell((cell) => {
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              };
            });
          }

          // Summary
          worksheet.addRow([]);
          worksheet.addRow(['Ringkasan:', `Total Hadir: ${report.total_hadir}`]);
          worksheet.addRow(['', `Total Sakit: ${report.total_sakit}`]);
          worksheet.addRow(['', `Total Izin: ${report.total_izin}`]);
          if (worksheet.lastRow) {
            const summaryStartRow = worksheet.lastRow.number - 2;
            worksheet.getCell(`A${summaryStartRow}`).font = {
              name: 'Times New Roman',
              size: 12,
              bold: true,
              color: { argb: 'FF000000' },
            };
            for (let i = 0; i < 3; i++) {
              worksheet.getCell(`B${summaryStartRow + i}`).font = {
                name: 'Times New Roman',
                size: 12,
                color: { argb: 'FF000000' },
              };
            }
          }

          if (scope === 'all' && index < reportData.length - 1) {
            worksheet.addRow([]);
          }
        });

        worksheet.getColumn(2).numFmt = 'dd-mmm-yyyy';
        worksheet.getColumn(5).numFmt = 'dd-mmm-yyyy';

        const buffer = await workbook.xlsx.writeBuffer();
        return new NextResponse(Buffer.from(buffer), {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=Laporan_Absensi_${monthNames[bulan - 1]}_${tahun}.xlsx`,
          },
        });
      } else if (format === 'pdf') {
        const fontPath = path.resolve('public/fonts/times.ttf');
        const logoPath = path.resolve('public/images/citra_buana_cemerlang1.png');

        console.log('Font path:', fontPath, 'exists:', fs.existsSync(fontPath));
        console.log('Logo path:', logoPath, 'exists:', fs.existsSync(logoPath));

        if (!fs.existsSync(fontPath)) {
          console.error(`File font tidak ditemukan di ${fontPath}`);
          throw new Error(`File font tidak ditemukan di ${fontPath}`);
        }

        const doc = new PDFDocument({
          margin: 40,
          font: fontPath,
          info: { Title: 'Laporan Absensi CV Citra Buana Cemerlang' },
        });
        const buffers: Uint8Array[] = [];

        doc.on('data', (chunk: Uint8Array) => buffers.push(chunk));

        try {
          doc.registerFont('TimesNewRoman', fontPath);
          doc.font('TimesNewRoman');
        } catch (fontError) {
          console.error('Gagal memuat font TimesNewRoman:', fontError);
          throw new Error('Gagal memuat font TimesNewRoman');
        }

        reportData.forEach((report, index) => {
          if (index > 0) {
            doc.addPage();
          }

          // Header
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 30, {
              width: 60,
              height: 60,
              align: 'center',
              valign: 'center',
            });
            doc.fontSize(16)
              .fillColor('#000000')
              .font('TimesNewRoman')
              .text('CV CITRA BUANA CEMERLANG', 110, 40, { align: 'center' });
            doc.fontSize(14)
              .fillColor('#000000')
              .text(`LAPORAN ABSENSI BULAN ${monthNames[bulan - 1].toUpperCase()} ${tahun}`, 110, 65, { align: 'center' });
          } else {
            doc.fontSize(16)
              .fillColor('#000000')
              .font('TimesNewRoman')
              .text('CV CITRA BUANA CEMERLANG', 40, 30, { align: 'center' });
            doc.fontSize(14)
              .fillColor('#000000')
              .text(`LAPORAN ABSENSI BULAN ${monthNames[bulan - 1].toUpperCase()} ${tahun}`, 40, 50, { align: 'center' });
          }

          doc.lineWidth(1)
            .moveTo(40, 90)
            .lineTo(550, 90)
            .stroke();

          doc.moveDown(2);

          // Employee Info
          doc.fontSize(12)
            .fillColor('#000000')
            .text(`Karyawan: ${report.karyawan_nama || `ID: ${report.karyawan_id}`}`, 40, doc.y);
          doc.moveDown(1);

          // Table
          const tableTop = doc.y;
          const col1Left = 40, col2Left = 60, col3Left = 120;
          const col1Right = 310, col2Right = 330, col3Right = 390;
          const rowHeight = 20;

          // Table Headers
          doc.rect(col1Left, tableTop - 5, 230, rowHeight).fill('#D3D3D3');
          doc.rect(col1Right, tableTop - 5, 230, rowHeight).fill('#D3D3D3');
          doc.fontSize(12)
            .fillColor('#000000')
            .text('No', col1Left, tableTop, { align: 'left', width: 20 })
            .text('Tanggal', col2Left, tableTop, { align: 'center', width: 60 })
            .text('Status', col3Left, tableTop, { align: 'left', width: 100 })
            .text('No', col1Right, tableTop, { align: 'left', width: 20 })
            .text('Tanggal', col2Right, tableTop, { align: 'center', width: 60 })
            .text('Status', col3Right, tableTop, { align: 'left', width: 100 });

          doc.moveDown(1);

          // Split detail into two columns
          const leftColumn = report.detail.slice(0, 15);
          const rightColumn = report.detail.slice(15, 31);
          const maxRows = Math.max(leftColumn.length, rightColumn.length);

          for (let i = 0; i < maxRows; i++) {
            const rowTop = doc.y;
            const left = leftColumn[i] || { tanggal: '-', status: '-' };
            const right = rightColumn[i] || { tanggal: '-', status: '-' };

            if (i % 2 === 0) {
              doc.rect(col1Left, rowTop - 5, 230, rowHeight).fill('#F5F6F5');
              doc.rect(col1Right, rowTop - 5, 230, rowHeight).fill('#F5F6F5');
            }

            doc.fillColor('#000000')
              .fontSize(12)
              .text(leftColumn[i] ? `${i + 1}` : '', col1Left, rowTop, { align: 'left', width: 20 })
              .text(left.tanggal, col2Left, rowTop, { align: 'left', width: 60 })
              .text(left.status, col3Left, rowTop, { align: 'left', width: 100 })
              .text(rightColumn[i] ? `${i + 16}` : '', col1Right, rowTop, { align: 'left', width: 20 })
              .text(right.tanggal, col2Right, rowTop, { align: 'left', width: 60 })
              .text(right.status, col3Right, rowTop, { align: 'left', width: 100 });

            doc.moveDown(1);
          }

          // Summary
          doc.moveDown(1);
          doc.fontSize(12)
            .fillColor('#000000')
            .text(`Total Hadir: ${report.total_hadir}`, 40, doc.y)
            .text(`Total Sakit: ${report.total_sakit}`, 40, doc.y + 15)
            .text(`Total Izin: ${report.total_izin}`, 40, doc.y + 15);
        });

        doc.end();

        return new Promise<NextResponse>((resolve) => {
          doc.on('end', () => {
            const pdfBuffer = Buffer.from(Buffer.concat(buffers));
            resolve(
              new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                  ...corsHeaders(),
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': print
                    ? `inline; filename=report_${monthNames[bulan - 1]}_${tahun}.pdf`
                    : `attachment; filename=report_${monthNames[bulan - 1]}_${tahun}.pdf`,
                },
              })
            );
          });
        });
      }

      return NextResponse.json(scope === 'single' ? reportData[0] : reportData, { status: 200, headers: corsHeaders() });
    } catch (error) {
      console.error('❌ Gagal menghasilkan laporan:', {
        message: error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
        stack: error instanceof Error ? error.stack : undefined,
        karyawan_id,
        bulan,
        tahun,
        format,
        scope,
      });
      return NextResponse.json(
        {
          error: 'Gagal menghasilkan laporan',
          details: error instanceof Error ? error.message : 'Kesalahan tidak diketahui',
        },
        { status: 500, headers: corsHeaders() }
      );
    } finally {
      await prisma.$disconnect();
      console.log('Database terputus');
    }
  } catch (error) {
    console.error('Gagal memverifikasi token:', error);
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401, headers: corsHeaders() });
  }
}