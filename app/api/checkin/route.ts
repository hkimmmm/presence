/* eslint-disable @typescript-eslint/no-explicit-any */
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

// export async function POST(req: NextRequest) {
//   const headers = corsHeaders();
//   const auth = await authorize(req);
//   if (!auth || auth.user.role === 'admin') {
//     return new NextResponse(JSON.stringify({ message: 'Hanya karyawan yang dapat melakukan check-in' }), { status: 401, headers });
//   }

//   try {
//     const body = await req.json();
//     console.log('📥 Request body:', body);
//     const { batchId, type, checkin_lat, checkin_lng, status = 'hadir' } = body;

//     if (type !== 'checkin') {
//       return new NextResponse(JSON.stringify({ message: 'Jenis QR tidak valid' }), { status: 400, headers });
//     }

//     // Validasi QR code massal
//     const [batchRows]: any = await pool.query(
//       'SELECT id, expires_at FROM qr_batches WHERE id = ? AND type = ? AND expires_at > NOW()',
//       [batchId, type]
//     );
//     if (batchRows.length === 0) {
//       return new NextResponse(JSON.stringify({ message: 'QR code tidak valid atau kedaluwarsa' }), { status: 400, headers });
//     }

//     const karyawan_id = auth.user.karyawan_id;

//     // Gunakan waktu WIB
//     const now = new Date().toLocaleString('en-CA', {
//       timeZone: 'Asia/Jakarta',
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       hour12: false,
//     }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
//     const tanggalFormatted = now.split(' ')[0];
//     const datetimeCheckin = now;

//     // Cek apakah sudah checkin hari ini
//     const [existingPresensi]: any = await pool.query(
//       'SELECT id FROM presensi WHERE karyawan_id = ? AND tanggal = ? AND checkout_time IS NULL LIMIT 1',
//       [karyawan_id, tanggalFormatted]
//     );
//     if (existingPresensi.length > 0) {
//       return new NextResponse(JSON.stringify({ message: 'Anda sudah check-in dan belum check-out' }), { status: 400, headers });
//     }

//     let keterangan = '';
//     let validatedLat = checkin_lat;
//     let validatedLng = checkin_lng;

//     if (status === 'hadir') {
//       if (checkin_lat == null || checkin_lng == null) {
//         return new NextResponse(
//           JSON.stringify({ message: 'Lokasi wajib diisi untuk presensi hadir' }),
//           { status: 400, headers }
//         );
//       }

//       const [kantorRows]: any = await pool.query('SELECT * FROM lokasi_kantor LIMIT 1');
//       if (kantorRows.length === 0) {
//         return new NextResponse(
//           JSON.stringify({ message: 'Lokasi kantor belum di-set' }),
//           { status: 400, headers }
//         );
//       }

//       const kantor = kantorRows[0];
//       const jarak = hitungJarak(checkin_lat, checkin_lng, kantor.latitude, kantor.longitude);
//       if (jarak > kantor.radius_meter) {
//         return new NextResponse(
//           JSON.stringify({ message: 'Anda berada di luar radius lokasi kantor', jarak, radius: kantor.radius_meter }),
//           { status: 400, headers }
//         );
//       }

//       keterangan = `Check-in QR Code - Lokasi: ${kantor.nama || 'Kantor'} (lat: ${checkin_lat}, lng: ${checkin_lng})`;
//     } else if (status === 'cuti' || status === 'izin') {
//       keterangan = `Check-in ${status.toUpperCase()} - Tanpa lokasi`;
//       validatedLat = 0;
//       validatedLng = 0;
//     } else {
//       return new NextResponse(JSON.stringify({ message: 'Status presensi tidak valid' }), { status: 400, headers });
//     }

//     const [result]: any = await pool.query(
//       `INSERT INTO presensi (karyawan_id, tanggal, checkin_time, checkin_lat, checkin_lng, status, keterangan, created_at, updated_at)
//        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
//       [karyawan_id, tanggalFormatted, datetimeCheckin, validatedLat, validatedLng, status, keterangan]
//     );

//     return new NextResponse(
//       JSON.stringify({ message: 'Check-in berhasil', presensi_id: result.insertId }),
//       { status: 201, headers }
//     );

//   } catch (error: any) {
//     console.error('Check-in error:', error);
//     return new NextResponse(
//       JSON.stringify({ message: 'Gagal melakukan check-in', error: error.message }),
//       { status: 500, headers }
//     );
//   }
// }
export async function POST(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth || auth.user.role === 'admin') {
    return new NextResponse(JSON.stringify({ message: 'Hanya karyawan yang dapat melakukan check-in' }), { status: 401, headers });
  }

  try {
    const body = await req.json();
    console.log('📥 Request body:', body);
    const { batchId, type, checkin_lat, checkin_lng, status = 'hadir' } = body;

    if (type !== 'checkin') {
      return new NextResponse(JSON.stringify({ message: 'Jenis QR tidak valid' }), { status: 400, headers });
    }

    // Validasi QR code massal
    const [batchRows]: any = await pool.query(
      'SELECT id, expires_at FROM qr_batches WHERE id = ? AND type = ? AND expires_at > NOW()',
      [batchId, type]
    );
    if (batchRows.length === 0) {
      return new NextResponse(JSON.stringify({ message: 'QR code tidak valid atau kedaluwarsa' }), { status: 400, headers });
    }

    const karyawan_id = auth.user.karyawan_id;

    // Gunakan waktu WIB
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
    const datetimeCheckin = now;

    // Cek apakah sudah checkin hari ini
    const [existingPresensi]: any = await pool.query(
      'SELECT id FROM presensi WHERE karyawan_id = ? AND tanggal = ? AND checkout_time IS NULL LIMIT 1',
      [karyawan_id, tanggalFormatted]
    );
    if (existingPresensi.length > 0) {
      return new NextResponse(JSON.stringify({ message: 'Anda sudah check-in dan belum check-out' }), { status: 400, headers });
    }

    let keterangan = '';
    let validatedLat = checkin_lat;
    let validatedLng = checkin_lng;

    // Validasi waktu check-in untuk keterlambatan
    const checkinTime = new Date(datetimeCheckin);
    const hours = checkinTime.getHours();
    const minutes = checkinTime.getMinutes();
    const isLate = hours > 8 || (hours === 8 && minutes > 15);

    if (status === 'hadir') {
      if (checkin_lat == null || checkin_lng == null) {
        return new NextResponse(
          JSON.stringify({ message: 'Lokasi wajib diisi untuk presensi hadir' }),
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
      const jarak = hitungJarak(checkin_lat, checkin_lng, kantor.latitude, kantor.longitude);
      if (jarak > kantor.radius_meter) {
        return new NextResponse(
          JSON.stringify({ message: 'Anda berada di luar radius lokasi kantor', jarak, radius: kantor.radius_meter }),
          { status: 400, headers }
        );
      }

      keterangan = isLate ? 'Terlambat' : 'Check-in QR Code';
    } else if (status === 'cuti' || status === 'izin') {
      keterangan = `Check-in ${status.toUpperCase()}`;
      validatedLat = 0;
      validatedLng = 0;
    } else {
      return new NextResponse(JSON.stringify({ message: 'Status presensi tidak valid' }), { status: 400, headers });
    }

    const [result]: any = await pool.query(
      `INSERT INTO presensi (karyawan_id, tanggal, checkin_time, checkin_lat, checkin_lng, status, keterangan, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [karyawan_id, tanggalFormatted, datetimeCheckin, validatedLat, validatedLng, status, keterangan]
    );

    return new NextResponse(
      JSON.stringify({ message: 'Check-in berhasil', presensi_id: result.insertId }),
      { status: 201, headers }
    );

  } catch (error: any) {
    console.error('Check-in error:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal melakukan check-in', error: error.message }),
      { status: 500, headers }
    );
  }
}