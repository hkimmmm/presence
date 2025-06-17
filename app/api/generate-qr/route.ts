import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/utils/db';

type QRType = 'checkin' | 'checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type: QRType = body.type;
    const presensiId = body.presensiId;

    // Validasi input
    if (type !== 'checkin' && type !== 'checkout') {
      return NextResponse.json({ message: 'Jenis QR tidak valid' }, { status: 400 });
    }

    if (!presensiId || isNaN(Number(presensiId))) {
      return NextResponse.json({ message: 'presensiId wajib diisi dan berupa angka' }, { status: 400 });
    }

    // Cek apakah presensiId ada di tabel presensi
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [presensiRows]: any = await pool.query(
      `SELECT id, checkout_time FROM presensi WHERE id = ? LIMIT 1`,
      [presensiId]
    );

    if (presensiRows.length === 0) {
      return NextResponse.json({ message: 'Presensi tidak ditemukan' }, { status: 404 });
    }

    // Jika type adalah checkout, pastikan belum check-out
    if (type === 'checkout' && presensiRows[0].checkout_time !== null) {
      return NextResponse.json({ message: 'Presensi ini sudah check-out' }, { status: 400 });
    }

    // Buat payload QR code
    const payload = {
      token: Number(presensiId),
      type,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    return NextResponse.json({
      qrCode: encoded,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('QR Code error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan saat generate QR' }, { status: 500 });
  }
}
