import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function corsHeaders() {
  return {
    // 'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
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

function hitungJarak(lat1: number, lng1: number, lat2: Decimal, lng2: Decimal): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const lat2Num = lat2.toNumber();
  const lng2Num = lng2.toNumber();
  const dLat = toRad(lat2Num - lat1);
  const dLng = toRad(lng2Num - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2Num)) * Math.sin(dLng / 2) ** 2;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = null;
  try {
    body = await req.json();
    console.log('📥 Request body:', body);
    const { batchId, presensiId, type, checkout_lat, checkout_lng } = body;

    if (type !== 'checkout') {
      return new NextResponse(JSON.stringify({ message: 'Jenis QR tidak valid' }), {
        status: 400, headers,
      });
    }

    // Gunakan waktu WIB untuk hari saat ini
    const now = new Date();
    const datetimeCheckout = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const tanggalFormatted = datetimeCheckout.toISOString().split('T')[0]; // YYYY-MM-DD

    const karyawan_id = auth.user.karyawan_id;
    let presensi;

    // Validasi QR code
    if (batchId) {
      // QR massal
      const batch = await prisma.qr_batches.findFirst({
        where: {
          id: batchId,
          type: type,
          expires_at: { gt: new Date() },
        },
      });
      if (!batch) {
        return new NextResponse(
          JSON.stringify({ message: 'QR code tidak valid atau kedaluwarsa' }),
          { status: 400, headers }
        );
      }

      // Cari presensi aktif untuk hari ini
      presensi = await prisma.presensi.findFirst({
        where: {
          karyawan_id: parseInt(karyawan_id),
          tanggal: new Date(tanggalFormatted),
          checkout_time: null,
        },
      });
      if (!presensi) {
        return new NextResponse(
          JSON.stringify({ message: 'Tidak ada presensi aktif untuk hari ini. Silakan check-in terlebih dahulu.' }),
          { status: 400, headers }
        );
      }
    } else if (presensiId) {
      // QR perorangan
      presensi = await prisma.presensi.findFirst({
        where: {
          id: parseInt(presensiId),
          karyawan_id: parseInt(karyawan_id),
          tanggal: new Date(tanggalFormatted),
          checkout_time: null,
        },
      });
      if (!presensi) {
        return new NextResponse(
          JSON.stringify({ message: 'Presensi tidak ditemukan, sudah check-out, atau bukan untuk hari ini.' }),
          { status: 400, headers }
        );
      }
    } else {
      return new NextResponse(
        JSON.stringify({ message: 'batchId atau presensiId wajib diisi' }),
        { status: 400, headers }
      );
    }

    const presensiIdFinal = presensi.id;
    const presensiStatus = presensi.status;

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

      const kantor = await prisma.lokasi_kantor.findFirst();
      if (!kantor) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi kantor belum ditetapkan' }),
          { status: 500, headers }
        );
      }

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

      keterangan = `Check-out QR Code - Lokasi: ${kantor.nama_kantor || 'Kantor'} (lat: ${checkout_lat}, lng: ${checkout_lng})`;
    } else {
      keterangan = `Check-out ${presensiStatus.toUpperCase()}`;
      validatedLat = null;
      validatedLng = null;
    }

    // Update presensi dengan Prisma
    await prisma.presensi.update({
      where: { id: presensiIdFinal },
      data: {
        checkout_time: datetimeCheckout,
        checkout_lat: validatedLat,
        checkout_lng: validatedLng,
        keterangan: {
          set: presensi.keterangan + '\n' + keterangan,
        },
        updated_at: new Date(),
      },
    });

    return new NextResponse(
      JSON.stringify({ message: 'Check-out berhasil', presensiId: presensiIdFinal }),
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error('Gagal melakukan check-out:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: body,
    });
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan server';
    return new NextResponse(
      JSON.stringify({ message: 'Gagal melakukan check-out', error: errorMessage }),
      { status: 500, headers }
    );
  }
}