/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
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
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

function hitungJarak(lat1: number, lng1: number, lat2: Decimal, lng2: Decimal): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  // Convert Decimal to number
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

async function authorize(req: NextRequest): Promise<{ user: any } | null> {
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
    return new NextResponse(JSON.stringify({ message: 'Hanya karyawan yang dapat melakukan check-in' }), { 
      status: 401, 
      headers 
    });
  }

  try {
    const body = await req.json();
    console.log('📥 Request body:', body);
    const { batchId, type, checkin_lat, checkin_lng, status = 'hadir' } = body;

    if (type !== 'checkin') {
      return new NextResponse(JSON.stringify({ message: 'Jenis QR tidak valid' }), { 
        status: 400, 
        headers 
      });
    }

    // Validasi QR code massal dengan Prisma
    const validBatch = await prisma.qr_batches.findFirst({
      where: {
        id: batchId,
        type: type,
        expires_at: { gt: new Date() }
      }
    });

    if (!validBatch) {
      return new NextResponse(JSON.stringify({ message: 'QR code tidak valid atau kedaluwarsa' }), { 
        status: 400, 
        headers 
      });
    }

    const karyawan_id = auth.user.karyawan_id;

    // Gunakan waktu WIB
    const now = new Date();
    const datetimeCheckin = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const tanggalFormatted = datetimeCheckin.toISOString().split('T')[0]; // YYYY-MM-DD

    // Cek apakah sudah checkin hari ini dengan Prisma
    const existingPresensi = await prisma.presensi.findFirst({
      where: {
        karyawan_id: karyawan_id,
        tanggal: new Date(tanggalFormatted),
        checkout_time: null
      }
    });

    if (existingPresensi) {
      return new NextResponse(JSON.stringify({ message: 'Anda sudah check-in dan belum check-out' }), { 
        status: 400, 
        headers 
      });
    }

    let keterangan = '';
    let validatedLat = checkin_lat;
    let validatedLng = checkin_lng;

    // Validasi waktu check-in untuk keterlambatan
    const hours = datetimeCheckin.getHours();
    const minutes = datetimeCheckin.getMinutes();
    const isLate = hours > 8 || (hours === 8 && minutes > 15);

    if (status === 'hadir') {
      if (checkin_lat == null || checkin_lng == null) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi wajib diisi untuk presensi hadir' }),
          { status: 400, headers }
        );
      }

      // Get office location with Prisma
      const kantor = await prisma.lokasi_kantor.findFirst();
      if (!kantor) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi kantor belum di-set' }),
          { status: 400, headers }
        );
      }

      const jarak = hitungJarak(checkin_lat, checkin_lng, kantor.latitude, kantor.longitude);
      if (jarak > kantor.radius_meter) {
        return new NextResponse(
          JSON.stringify({ 
            message: 'Anda berada di luar radius lokasi kantor', 
            jarak, 
            radius: kantor.radius_meter 
          }),
          { status: 400, headers }
        );
      }

      keterangan = isLate ? 'Terlambat' : 'Check-in QR Code';
    } else if (status === 'cuti' || status === 'izin') {
      keterangan = `Check-in ${status.toUpperCase()}`;
      validatedLat = 0;
      validatedLng = 0;
    } else {
      return new NextResponse(JSON.stringify({ message: 'Status presensi tidak valid' }), { 
        status: 400, 
        headers 
      });
    }

    // Insert with Prisma
    const newPresensi = await prisma.presensi.create({
      data: {
        karyawan_id,
        tanggal: new Date(tanggalFormatted),
        checkin_time: datetimeCheckin, // Gunakan objek Date
        checkin_lat: validatedLat,
        checkin_lng: validatedLng,
        status,
        keterangan,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return new NextResponse(
      JSON.stringify({ 
        message: 'Check-in berhasil', 
        presensi_id: newPresensi.id 
      }),
      { status: 201, headers }
    );

  } catch (error: any) {
    console.error('Check-in error:', error);
    return new NextResponse(
      JSON.stringify({ 
        message: 'Gagal melakukan check-in', 
        error: error.message 
      }),
      { status: 500, headers }
    );
  }
}