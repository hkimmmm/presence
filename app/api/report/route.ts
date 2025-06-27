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
        color: { argb: 'FFFFFFFF' } 
    };
    worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002060' } // Biru navy
    };
    worksheet.getCell('A1').alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
    };

    // Judul Laporan
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `LAPORAN ABSENSI KARYAWAN - ${monthNames[bulan - 1]} ${tahun}`;
    worksheet.getCell('A2').font = {
        name: 'Calibri',
        size: 14,
        bold: true
    };
    worksheet.getCell('A2').alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
    };

    // Baris kosong
    worksheet.addRow([]);

    // Header Kolom
    worksheet.columns = [
        { header: 'ID Karyawan', key: 'karyawan_id', width: 12 },
        { header: 'Nama Karyawan', key: 'karyawan_nama', width: 25 },
        { header: 'Tanggal', key: 'tanggal', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Keterangan', key: 'keterangan', width: 30 }
    ];

    const headerRow = worksheet.getRow(4);
    headerRow.values = ['ID Karyawan', 'Nama Karyawan', 'Tanggal', 'Status', 'Keterangan'];
    headerRow.font = {
        name: 'Calibri',
        bold: true,
        size: 11,
        color: { argb: 'FF000000' }
    };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Abu-abu muda
    };
    headerRow.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
    };
    headerRow.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
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
            keterangan: ''
        });
        
        totalRow.font = { 
            name: 'Calibri', 
            bold: true, 
            size: 10 
        };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' } // Abu-abu sangat muda
        };
        worksheet.mergeCells(`D${totalRow.number}:E${totalRow.number}`);

        // Detail Absensi
        report.detail.forEach((item: any) => {
            const row = worksheet.addRow({
                karyawan_id: '',
                karyawan_nama: '',
                tanggal: item.tanggal,
                status: item.status,
                keterangan: item.keterangan || '-'
            });
            
            row.font = { 
                name: 'Calibri', 
                size: 10 
            };
            
            // Warna berbeda untuk setiap status
            const statusCell = row.getCell(4);
            switch(item.status.toLowerCase()) {
                case 'hadir':
                    statusCell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: 'FFC6EFCE' } // Hijau muda
                    };
                    break;
                case 'izin':
                    statusCell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: 'FFFFEB9C' } // Kuning
                    };
                    break;
                case 'sakit':
                    statusCell.fill = { 
                        type: 'pattern', 
                        pattern: 'solid', 
                        fgColor: { argb: 'FFFFC7CE' } // Merah muda
                    };
                    break;
            }
            
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
                };
            });
        });

        // Baris kosong antar karyawan (khusus laporan semua karyawan)
        if (scope === 'all' && index < reportData.length - 1) {
            worksheet.addRow([]);
        }
    });

    // Format semua cell tanggal
    worksheet.getColumn(3).eachCell((cell) => {
        if (cell.value && cell.value.toString().match(/^\d{4}-\d{2}-\d{2}$/)) {
            cell.numFmt = 'dd-mmm-yyyy'; // Format: 01-Jan-2023
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=Laporan_Absensi_${monthNames[bulan-1]}_${tahun}.xlsx`
        },
    });
} else if (format === 'pdf') {
    const fontPath = path.resolve('public/fonts/Merriweather-Regular.ttf');
    const logoPath = path.resolve('public/images/citra_buana_cemerlang1.png');

    if (!fs.existsSync(fontPath)) {
        return NextResponse.json({ error: 'Font file tidak ditemukan' }, { status: 500 });
    }
    if (!fs.existsSync(logoPath)) {
        console.warn('Logo file tidak ditemukan, akan dilanjutkan tanpa logo');
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

    // Header dengan logo dan judul
    if (fs.existsSync(logoPath)) {
        // Tambahkan logo di pojok kiri
        doc.image(logoPath, 50, 30, { 
            width: 60, 
            height: 60,
            align: 'center',
            valign: 'center'
        });
        
        // Judul perusahaan di sebelah kanan logo
        doc.fontSize(18)
          .fillColor('#2F5496')
          .text('CV Citra Buana Cemerlang', 120, 40, { align: 'center' });
          
        // Subjudul di bawah judul perusahaan
        doc.fontSize(14)
          .fillColor('#333333')
          .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 120, 65, { align: 'center' });
    } else {
        // Jika logo tidak ada, gunakan layout lama
        doc.fontSize(18)
          .fillColor('#2F5496')
          .text('CV Citra Buana Cemerlang', 50, 30, { align: 'center' });
          
        doc.fontSize(14)
          .fillColor('#333333')
          .text(`Laporan Absensi Bulan ${monthNames[bulan - 1]} ${tahun}`, 50, 50, { align: 'center' });
    }

    // Garis pemisah
    doc.lineWidth(1)
      .moveTo(50, 90)
      .lineTo(550, 90)
      .stroke();
      
    doc.moveDown(2);

    reportData.forEach((report, index) => {
        if (index > 0) {
            doc.addPage();
            // Repeat header on new page
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { 
                    width: 60, 
                    height: 60,
                    align: 'center',
                    valign: 'center'
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

        // Informasi karyawan
        doc.fontSize(12).fillColor('#333333').text(`Karyawan: ${report.karyawan_nama || `ID: ${report.karyawan_id}`}`, 50, doc.y);
        doc.fontSize(10).text(`Total Hadir: ${report.total_hadir}`, 50, doc.y + 15);
        doc.text(`Total Sakit: ${report.total_sakit}`, 50, doc.y + 10);
        doc.text(`Total Izin: ${report.total_izin}`, 50, doc.y + 10);
        doc.moveDown(2);

        // Header tabel
        const tableTop = doc.y;
        const col1 = 50, col2 = 150, col3 = 250;
        const rowHeight = 20;

        // 1. Gambar background header terlebih dahulu
        doc.rect(col1 - 5, tableTop - 5, 500, rowHeight).fill('#2F5496');
        
        // 2. Kemudian tambahkan teks di atasnya
        doc.fontSize(10)
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
                
                doc.fillColor('#333333')
                   .text(item.tanggal || 'Tidak ada', col1, rowTop, { align: 'left', width: 100 })
                   .text(item.status || 'Tidak ada', col2, rowTop, { align: 'center', width: 100 })
                   .text(item.keterangan || 'Tidak ada', col3, rowTop, { align: 'left', width: 300 });
                
                doc.moveDown(1);
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