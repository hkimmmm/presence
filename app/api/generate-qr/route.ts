// app/api/generate-qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/utils/db';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

type QRType = 'checkin' | 'checkout';

interface AuthUser {
  karyawan_id: number | null; // Izinkan null untuk admin
  role: string;
}

async function authorize(req: NextRequest): Promise<{ user: AuthUser } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { karyawan_id?: number; role?: string };
    return {
      user: {
        karyawan_id: decoded.karyawan_id || null, // Null untuk admin
        role: decoded.role || 'karyawan',
      },
    };
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verifikasi token
    const auth = await authorize(req);
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const type: QRType = body.type;
    const presensiId = body.presensiId;
    const targetKaryawanId = body.karyawan_id;
    const isMassQR = body.is_mass_qr;

    console.log('Menerima request:', { type, presensiId, targetKaryawanId, isMassQR, user: auth.user });

    // Validasi input
    if (type !== 'checkin' && type !== 'checkout') {
      return NextResponse.json({ message: 'Jenis QR tidak valid' }, { status: 400 });
    }

    if (isMassQR) {
      // Mode QR massal (hanya untuk admin)
      if (auth.user.role !== 'admin') {
        return NextResponse.json({ message: 'Hanya admin yang dapat membuat QR massal' }, { status: 403 });
      }

      // Buat batchId unik
      const today = new Date().toISOString().slice(0, 10);
      const batchId = `${today}-${uuidv4()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam dari sekarang

      // Simpan ke qr_batches, created_by bisa null untuk admin
      await pool.query(
        'INSERT INTO qr_batches (id, type, created_at, expires_at, created_by) VALUES (?, ?, NOW(), ?, ?)',
        [batchId, type, expiresAt, auth.user.karyawan_id]
      );

      // Buat payload QR code
      const payload = {
        type,
        batchId,
        expiresAt: expiresAt.toISOString(),
      };

      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

      return NextResponse.json({
        qrCode: encoded,
        expiresAt: expiresAt.toISOString(),
        batchId,
      });
    }

    // Mode QR perorangan
    if (!presensiId || isNaN(Number(presensiId))) {
      return NextResponse.json({ message: 'presensiId wajib diisi dan berupa angka' }, { status: 400 });
    }

    interface PresensiRow {
      id: number;
      checkout_time: string | null;
      karyawan_id: number;
    }

    const queryParams: (number | string)[] = [presensiId];
    let query = `SELECT id, checkout_time, karyawan_id FROM presensi WHERE id = ? LIMIT 1`;

    if (auth.user.role !== 'admin') {
      if (!auth.user.karyawan_id) {
        return NextResponse.json({ message: 'karyawan_id diperlukan untuk karyawan' }, { status: 400 });
      }
      query = `SELECT id, checkout_time, karyawan_id FROM presensi WHERE id = ? AND karyawan_id = ? LIMIT 1`;
      queryParams.push(auth.user.karyawan_id);
    } else if (targetKaryawanId) {
      query = `SELECT id, checkout_time, karyawan_id FROM presensi WHERE id = ? AND karyawan_id = ? LIMIT 1`;
      queryParams.push(targetKaryawanId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [presensiRows] = await pool.query(query, queryParams) as [PresensiRow[], any];

    console.log('Hasil query presensi:', presensiRows);

    if (presensiRows.length === 0) {
      return NextResponse.json({ message: 'Presensi tidak ditemukan atau tidak diizinkan' }, { status: 404 });
    }

    if (type === 'checkout' && presensiRows[0].checkout_time !== null) {
      return NextResponse.json({ message: 'Presensi ini sudah check-out' }, { status: 400 });
    }

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