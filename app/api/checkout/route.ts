import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/app/utils/db';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

interface JwtPayload {
  karyawan_id: string;
  role: string;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    console.error('Token tidak valid:', err);
    return null;
  }
}

function hitungJarak(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function authorize(req: NextRequest): Promise<{ user: JwtPayload } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { user: payload };
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth || auth.user.role === 'admin') {
    return new NextResponse(
      JSON.stringify({ message: 'Hanya karyawan yang dapat melakukan check-out' }),
      { status: 401, headers }
    );
  }

  try {
    const body = await req.json();
    console.log('📥 Request body:', body);
    const { batchId, presensiId, type, checkout_time, checkout_lat, checkout_lng } = body;

    if (type !== 'checkout') {
      return new NextResponse(JSON.stringify({ message: 'Jenis QR tidak valid' }), {
        status: 400, headers,
      });
    }

    // Gunakan waktu WIB untuk hari saat ini
    const now = new Date().toLocaleString('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
    const tanggalFormatted = now.split(' ')[0];

    const karyawan_id = auth.user.karyawan_id;
    let presensi: RowDataPacket;

    // Validasi QR code
    if (batchId) {
      // QR massal
      const [batchRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, expires_at FROM qr_batches WHERE id = ? AND type = ? AND expires_at IS NOT NULL AND expires_at > NOW()',
        [batchId, type]
      );
      if (!batchRows || batchRows.length === 0) {
        return new NextResponse(
          JSON.stringify({ message: 'QR code tidak valid atau kedaluwarsa' }),
          { status: 400, headers }
        );
      }

      // Cari presensi aktif untuk hari ini
      const [presensiRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, status, tanggal FROM presensi WHERE karyawan_id = ? AND checkout_time IS NULL AND tanggal = ? LIMIT 1',
        [karyawan_id, tanggalFormatted]
      );
      if (!presensiRows || presensiRows.length === 0) {
        return new NextResponse(
          JSON.stringify({ message: 'Tidak ada presensi aktif untuk hari ini. Silakan check-in terlebih dahulu.' }),
          { status: 400, headers }
        );
      }
      presensi = presensiRows[0];
    } else if (presensiId) {
      // QR perorangan
      const [presensiRows] = await pool.query<RowDataPacket[]>(
        'SELECT id, status, tanggal, karyawan_id FROM presensi WHERE id = ? AND karyawan_id = ? AND checkout_time IS NULL AND tanggal = ? LIMIT 1',
        [presensiId, karyawan_id, tanggalFormatted]
      );
      if (!presensiRows || presensiRows.length === 0) {
        return new NextResponse(
          JSON.stringify({ message: 'Presensi tidak ditemukan, sudah check-out, atau bukan untuk hari ini.' }),
          { status: 400, headers }
        );
      }
      presensi = presensiRows[0];
    } else {
      return new NextResponse(
        JSON.stringify({ message: 'batchId atau presensiId wajib diisi' }),
        { status: 400, headers }
      );
    }

    const presensiIdFinal = presensi.id;
    const presensiStatus = presensi.status;

    // Gunakan checkout_time dari klien atau waktu server
    const datetimeCheckout = checkout_time || now;
    console.log('⏰ Waktu check-out (WIB):', datetimeCheckout);

    let keterangan = '';
    let validatedLat = checkout_lat;
    let validatedLng = checkout_lng;

    if (presensiStatus === 'hadir') {
      if (checkout_lat == null || checkout_lng == null) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi wajib untuk check-out dengan status hadir' }),
          { status: 400, headers }
        );
      }

      const [kantorRows] = await pool.query<RowDataPacket[]>('SELECT * FROM lokasi_kantor LIMIT 1');
      if (!kantorRows || kantorRows.length === 0) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi kantor belum ditetapkan' }),
          { status: 500, headers }
        );
      }

      const kantor = kantorRows[0];
      const jarak = hitungJarak(checkout_lat, checkout_lng, kantor.latitude, kantor.longitude);
      if (jarak > kantor.radius_meter) {
        return new NextResponse(
          JSON.stringify({
            message: 'Anda berada di luar radius lokasi kantor',
            jarak,
            radius: kantor.radius_meter,
          }),
          { status: 400, headers }
        );
      }

      keterangan = `Check-out QR Code - Lokasi: ${kantor.nama || 'Kantor'} (lat: ${checkout_lat}, lng: ${checkout_lng})`;
    } else {
      keterangan = `Check-out ${presensiStatus.toUpperCase()}`;
      validatedLat = null;
      validatedLng = null;
    }

    await pool.query(
      'UPDATE presensi SET checkout_time = ?, checkout_lat = ?, checkout_lng = ?, keterangan = CONCAT(keterangan, "\n", ?), updated_at = NOW() WHERE id = ?',
      [datetimeCheckout, validatedLat, validatedLng, keterangan, presensiIdFinal]
    );

    return new NextResponse(
      JSON.stringify({ message: 'Check-out berhasil', presensiId: presensiIdFinal }),
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error('Gagal melakukan check-out:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return new NextResponse(
      JSON.stringify({ message: 'Gagal melakukan check-out', error: errorMessage }),
      { status: 500, headers }
    );
  }
}