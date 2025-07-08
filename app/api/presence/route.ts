/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/utils/prisma';

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
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function getTokenFromRequest(req: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  // Fallback to cookie
  return req.cookies.get('token')?.value || null;
}

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Invalid token:', err);
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

async function authorize(req: NextRequest): Promise<{ user: any } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { user: payload };
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders();

  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan: Token tidak valid' }), {
      status: 401,
      headers,
    });
  }

  try {
    const { karyawan_id, role } = auth.user;

    let presensi;
    if (['admin', 'supervisor'].includes(role)) {
      // Admin or Supervisor: Fetch all presence data
      presensi = await prisma.presensi.findMany({
        include: {
          karyawan: {
            select: {
              nama: true,
            },
          },
        },
      });
    } else {
      // Non-admin/supervisor: Fetch presence data only for the user's karyawan_id
      if (!karyawan_id) {
        return new NextResponse(JSON.stringify({ message: 'karyawan_id diperlukan untuk non-admin/supervisor' }), {
          status: 400,
          headers,
        });
      }
      presensi = await prisma.presensi.findMany({
        where: { karyawan_id },
        include: {
          karyawan: {
            select: {
              nama: true,
            },
          },
        },
      });
    }

    // Map the data to match the original response format
    const formattedPresensi = presensi.map(p => ({
      ...p,
      karyawan_nama: p.karyawan?.nama,
    }));

    return new NextResponse(JSON.stringify(formattedPresensi), { status: 200, headers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal mengambil data presensi', error: errorMessage }),
      { status: 500, headers }
    );
  }
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan: Token tidak valid' }), {
      status: 401,
      headers,
    });
  }

  try {
    const body = await req.json();
    console.log('📥 Request body:', body);
    const { checkin_lat, checkin_lng, status = 'hadir' } = body;

    if (!status) {
      return new NextResponse(JSON.stringify({ message: 'Status presensi harus diisi' }), {
        status: 400,
        headers,
      });
    }

    const karyawan_id = auth.user.karyawan_id;
    if (!karyawan_id) {
      return new NextResponse(JSON.stringify({ message: 'karyawan_id diperlukan' }), {
        status: 400,
        headers,
      });
    }

    // Use WIB time
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
    const datetimeCheckin = new Date(now);

    // Check for existing presensi
    const existingPresensi = await prisma.presensi.findFirst({
      where: {
        karyawan_id,
        tanggal: new Date(tanggalFormatted),
        checkout_time: null,
      },
    });

    if (existingPresensi) {
      return new NextResponse(
        JSON.stringify({ message: 'Anda sudah check-in hari ini dan belum check-out' }),
        { status: 400, headers }
      );
    }

    let keterangan = '';
    let validatedLat = checkin_lat;
    let validatedLng = checkin_lng;

    if (status === 'hadir') {
      if (checkin_lat == null || checkin_lng == null) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi wajib diisi untuk presensi hadir' }),
          { status: 400, headers }
        );
      }

      const kantor = await prisma.lokasi_kantor.findFirst();
      if (!kantor) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi kantor belum di-set' }),
          { status: 400, headers }
        );
      }

      const jarak = hitungJarak(checkin_lat, checkin_lng, Number(kantor.latitude), Number(kantor.longitude));
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

      keterangan = `Presensi QR Code - Lokasi: ${kantor.nama_kantor || 'Kantor'} (lat: ${checkin_lat}, lng: ${checkin_lng})`;
    } else if (status === 'cuti' || status === 'izin') {
      keterangan = `Presensi ${status.toUpperCase()} - Tanpa lokasi`;
      validatedLat = 0;
      validatedLng = 0;
    } else {
      return new NextResponse(
        JSON.stringify({ message: 'Status presensi tidak valid' }),
        { status: 400, headers }
      );
    }

    const newPresensi = await prisma.presensi.create({
      data: {
        karyawan_id,
        tanggal: new Date(tanggalFormatted),
        checkin_time: datetimeCheckin,
        checkin_lat: validatedLat ? Number(validatedLat) : null,
        checkin_lng: validatedLng ? Number(validatedLng) : null,
        status,
        keterangan,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return new NextResponse(
      JSON.stringify({
        message: `Check-in ${status} berhasil`,
        presensi_id: newPresensi.id,
      }),
      { status: 201, headers }
    );
  } catch (error: any) {
    console.error('Check-in error:', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Gagal melakukan check-in',
        error: error.message,
      }),
      { status: 500, headers }
    );
  }
}