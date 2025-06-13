import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/app/utils/db';

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

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const headers = corsHeaders();
  const auth = await authorize(req);

  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers,
    });
  }

  try {
    const params = await context.params;
    const presensiId = params.id;

    if (!presensiId || isNaN(Number(presensiId))) {
      return new NextResponse(JSON.stringify({ message: 'Presensi ID tidak valid' }), {
        status: 400,
        headers,
      });
    }

    const body = await req.json();
    const { checkout_time, checkout_lat, checkout_lng } = body;

    if (!checkout_time || checkout_lat == null || checkout_lng == null) {
      return new NextResponse(
        JSON.stringify({
          message: 'checkout_time, checkout_lat, dan checkout_lng harus diisi',
        }),
        { status: 400, headers }
      );
    }

    const [existingCheckoutRows]: any = await pool.query(
      `SELECT id FROM presensi WHERE id = ? AND checkout_time IS NOT NULL LIMIT 1`,
      [presensiId]
    );

    if (existingCheckoutRows.length > 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Anda sudah check-out hari ini' }),
        { status: 400, headers }
      );
    }

    const [kantorRows]: any = await pool.query('SELECT * FROM lokasi_kantor LIMIT 1');

    if (kantorRows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Lokasi kantor belum di-set' }),
        { status: 400, headers }
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

    const [presensiExistRows]: any = await pool.query(
      `SELECT id FROM presensi WHERE id = ? LIMIT 1`,
      [presensiId]
    );

    if (presensiExistRows.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'Presensi tidak ditemukan' }), {
        status: 404,
        headers,
      });
    }

    const keteranganCheckout = `Check-out QR Code - Lokasi: ${kantor.nama || 'Kantor'} (lat: ${checkout_lat}, lng: ${checkout_lng})`;
    const datetimeCheckout = new Date(checkout_time).toISOString().slice(0, 19).replace('T', ' ');

    const [result]: any = await pool.query(
      `UPDATE presensi 
       SET checkout_time = ?, checkout_lat = ?, checkout_lng = ?, keterangan = ?, updated_at = NOW() 
       WHERE id = ?`,
      [datetimeCheckout, checkout_lat, checkout_lng, keteranganCheckout, presensiId]
    );

    if (result.affectedRows === 0) {
      return new NextResponse(JSON.stringify({ message: 'Data presensi tidak ditemukan' }), {
        status: 404,
        headers,
      });
    }

   return new NextResponse(JSON.stringify({
  message: 'Check-out berhasil',
  presensi: {
    id: presensiId,
    checkout_time: datetimeCheckout,
    checkout_lat,
    checkout_lng,
    status: 'hadir',
  },
}), {
  status: 200,
  headers,
});
  } catch (error: any) {
    console.error('❌ Failed to perform check-out:', error.message);
    return new NextResponse(
      JSON.stringify({
        message: 'Gagal melakukan check-out',
        error: error.message,
      }),
      { status: 500, headers }
    );
  }
}
