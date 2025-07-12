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
  console.log('Cookies received:', req.cookies.getAll()); // Debug

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
    console.log('Token decoded:', decoded); // Debug
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
            keterangan: true,
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
            keterangan: true,
          },
        });
        console.log(`Izin untuk karyawan_id ${karyawan.id}:`, JSON.stringify(izinRows, null, 2));

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

        const detail = Object.values(byTanggal)
          .filter((row: any) => typeof row.tanggal === 'string')
          .sort((a: any, b: any) => a.tanggal.localeCompare(b.tanggal));
        console.log(`Detail untuk karyawan_id ${karyawan.id}:`, JSON.stringify(detail, null, 2));

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

      if (reportData.length === 0) {
        console.log('Tidak ada data laporan untuk periode ini');
        return NextResponse.json([], { status: 200, headers: corsHeaders() });
      }

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Absensi');

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

        worksheet.addRow([]);

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

        reportData.forEach((report, index) => {
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

          if (scope === 'all' && index < reportData.length - 1) {
            worksheet.addRow([]);
          }
        });

        worksheet.getColumn(3).eachCell((cell) => {
          if (cell.value && cell.value.toString().match(/^\d{4}-\d{2}-\d{2}$/)) {
            cell.numFmt = 'dd-mmm-yyyy';
          }
        });

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
        const fontPath = path.resolve('public/fonts/Merriweather-Regular.ttf');
        const logoPath = path.resolve('public/images/citra_buana_cemerlang1.png');

        console.log('Font path:', fontPath, 'exists:', fs.existsSync(fontPath));
        console.log('Logo path:', logoPath, 'exists:', fs.existsSync(logoPath));

        if (!fs.existsSync(fontPath)) {
          console.error(`File font tidak ditemukan di ${fontPath}`);
          throw new Error(`File font tidak ditemukan di ${fontPath}`);
        }

        if (!fs.existsSync(logoPath)) {
          console.warn(`Logo tidak ditemukan di ${logoPath}`);
        }

        const doc = new PDFDocument({
          margin: 40,
          font: fontPath,
          info: { Title: 'Laporan Absensi CV Citra Buana Cemerlang' },
        });
        const buffers: Uint8Array[] = [];

        doc.on('data', (chunk: Uint8Array) => buffers.push(chunk));

        try {
          doc.registerFont('Merriweather', fontPath);
          doc.font('Merriweather');
        } catch (fontError) {
          console.error('Gagal memuat font Merriweather:', fontError);
          doc.font('Helvetica');
        }

        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 30, {
            width: 60,
            height: 60,
            align: 'center',
            valign: 'center',
          });
          doc.fontSize(18)
            .fillColor('#2F5496')
            .text('CV Citra Buana Cemerlang', 120, 40, { align: 'center' });
          doc.fontSize(14)
            .fillColor('#333333')
            .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 120, 65, { align: 'center' });
        } else {
          doc.fontSize(18)
            .fillColor('#2F5496')
            .text('CV Citra Buana Cemerlang', 50, 30, { align: 'center' });
          doc.fontSize(14)
            .fillColor('#333333')
            .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center' });
        }

        doc.lineWidth(1)
          .moveTo(50, 90)
          .lineTo(550, 90)
          .stroke();

        doc.moveDown(2);

        reportData.forEach((report, index) => {
          if (index > 0) {
            doc.addPage();
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, 50, 30, {
                width: 60,
                height: 60,
                align: 'center',
                valign: 'center',
              });
              doc.fontSize(18)
                .fillColor('#2F5496')
                .text('CV Citra Buana Cemerlang', 120, 40, { align: 'center' });
              doc.fontSize(14)
                .fillColor('#333333')
                .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 120, 65, { align: 'center' });
            } else {
              doc.fontSize(18)
                .fillColor('#2F5496')
                .text('CV Citra Buana Cemerlang', 50, 30, { align: 'center' });
              doc.fontSize(14)
                .fillColor('#333333')
                .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center' });
            }
            doc.lineWidth(1).moveTo(50, 90).lineTo(550, 90).stroke();
            doc.moveDown(2);
          }

          doc.fontSize(12).fillColor('#333333').text(`Karyawan: ${report.karyawan_nama || `ID: ${report.karyawan_id}`}`, 50, doc.y);
          doc.fontSize(10).text(`Total Hadir: ${report.total_hadir}`, 50, doc.y + 15);
          doc.text(`Total Sakit: ${report.total_sakit}`, 50, doc.y + 10);
          doc.text(`Total Izin: ${report.total_izin}`, 50, doc.y + 10);
          doc.moveDown(2);

          const tableTop = doc.y;
          const col1 = 50,
            col2 = 150,
            col3 = 250;
          const rowHeight = 20;

          doc.rect(col1 - 5, tableTop - 5, 500, rowHeight).fill('#2F5496');
          doc.fontSize(10)
            .fillColor('#FFFFFF')
            .text('Tanggal', col1, tableTop, { align: 'left', width: 100 })
            .text('Status', col2, tableTop, { align: 'center', width: 100 })
            .text('Keterangan', col3, tableTop, { align: 'left', width: 300 });

          doc.moveDown(1);

          if (report.detail.length === 0) {
            console.log(`Tidak ada data untuk karyawan_id ${report.karyawan_id} pada bulan ${bulan} ${tahun}`);
            doc.text('Tidak ada data absensi untuk periode ini.', col1, doc.y, { width: 500 });
            doc.moveDown(1);
          } else {
            report.detail.forEach((item: any, i: number) => {
              const rowTop = doc.y;
              if (i % 2 === 0) {
                doc.rect(col1 - 5, rowTop - 5, 500, rowHeight).fill('#F5F6F5');
              }
              doc.fillColor('#333333')
                .text(item.tanggal || 'Tidak ada', col1, rowTop, { align: 'left', width: 100 })
                .text(item.status || 'Tidak ada', col2, rowTop, { align: 'center', width: 100 })
                .text(item.keterangan || 'Tidak ada', col3, rowTop, { align: 'left', width: 300 });
              doc.moveDown(1);
            });
          }

          doc.lineWidth(0.5).moveTo(col1 - 5, doc.y).lineTo(col1 + col3 + 245, doc.y).stroke();
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