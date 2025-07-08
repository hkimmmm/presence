import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

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
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '');
}

interface JwtPayload {
  user_id: number;
  username: string;
  role: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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

async function authorize(req: NextRequest): Promise<{ user: JwtPayload } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { user: payload };
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const headers = corsHeaders();
  const auth = await authorize(req);

  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const presensiId = parseInt(context.params.id);

    if (isNaN(presensiId)) {
      return new NextResponse(JSON.stringify({ message: 'Presensi ID tidak valid' }), {
        status: 400,
        headers,
      });
    }

    const body = await req.json();
    const { checkout_lat, checkout_lng } = body;

    if (checkout_lat == null || checkout_lng == null) {
      return new NextResponse(
        JSON.stringify({
          message: 'checkout_lat dan checkout_lng harus diisi',
        }),
        { status: 400, headers }
      );
    }

    // Generate WIB timestamp for checkout_time
    const datetimeCheckout = new Date()
      .toLocaleString('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2')
      .replace(',', '');

    console.log('⏰ Server checkout time (WIB):', datetimeCheckout);

    // Check for existing checkout
    const existingCheckout = await prisma.presensi.findFirst({
      where: {
        id: presensiId,
        NOT: {
          checkout_time: null,
        },
      },
    });

    if (existingCheckout) {
      return new NextResponse(
        JSON.stringify({ message: 'Anda sudah check-out hari ini' }),
        { status: 400, headers }
      );
    }

    // Check office location
    const kantor = await prisma.lokasi_kantor.findFirst();

    if (!kantor) {
      return new NextResponse(
        JSON.stringify({ message: 'Lokasi kantor belum di-set' }),
        { status: 400, headers }
      );
    }

    const jarak = hitungJarak(
      checkout_lat,
      checkout_lng,
      kantor.latitude,
      kantor.longitude
    );

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

    // Check if presensi exists
    const presensiExist = await prisma.presensi.findUnique({
      where: { id: presensiId },
    });

    if (!presensiExist) {
      return new NextResponse(JSON.stringify({ message: 'Presensi tidak ditemukan' }), {
        status: 404,
        headers,
      });
    }

    const keteranganCheckout = `Check-out QR Code - Lokasi: ${kantor.nama_kantor || 'Kantor'} (lat: ${checkout_lat}, lng: ${checkout_lng})`;

    // Update presensi record
    const updatedPresensi = await prisma.presensi.update({
      where: { id: presensiId },
      data: {
        checkout_time: datetimeCheckout,
        checkout_lat: checkout_lat,
        checkout_lng: checkout_lng,
        keterangan: keteranganCheckout,
        updated_at: new Date(),
      },
    });

    return new NextResponse(
      JSON.stringify({
        message: 'Check-out berhasil',
        presensi: {
          id: updatedPresensi.id,
          checkout_time: updatedPresensi.checkout_time,
          checkout_lat: updatedPresensi.checkout_lat,
          checkout_lng: updatedPresensi.checkout_lng,
          status: 'hadir',
        },
      }),
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error('❌ Failed to perform check-out:', error instanceof Error ? error.message : error);
    return new NextResponse(
      JSON.stringify({
        message: 'Gagal melakukan check-out',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers }
    );
  }
}