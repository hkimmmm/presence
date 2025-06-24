import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/utils/db';
import { RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Fungsi untuk mendapatkan token dari request
function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  const token = req.cookies.get('token')?.value;
  return token || null;
}

// Fungsi untuk memverifikasi token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

// Handler untuk GET request
export async function GET(req: NextRequest) {
  let connection;
  try {
    // Ambil dan verifikasi token
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Batasi akses untuk admin atau supervisor
    if (decoded.role !== 'admin' && decoded.role !== 'supervisor') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Koneksi ke database
    connection = await pool.getConnection();

    // 1. Ringkasan Presensi (jumlah karyawan hadir hari ini)
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const [presensiRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as totalHadir 
       FROM presensi 
       WHERE tanggal = ? AND status = 'hadir'`,
      [today]
    );
    const totalHadirHariIni = presensiRows[0]?.totalHadir || 0;

    // 2. Daftar Karyawan (karyawan aktif, limit 10)
    const [karyawanRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, nama, email, no_telepon, tanggal_bergabung 
       FROM karyawan 
       WHERE status = 'aktif' 
       LIMIT 10`
    );

    // 3. Permintaan Cuti (status pending, limit 5)
    const [leaveRequestRows] = await connection.execute<RowDataPacket[]>(
      `SELECT lr.id, lr.jenis, lr.tanggal_mulai, lr.tanggal_selesai, lr.keterangan, k.nama as karyawan_nama 
       FROM leave_requests lr 
       JOIN karyawan k ON lr.karyawan_id = k.id 
       WHERE lr.status = 'pending' 
       LIMIT 5`
    );

    // 4. Informasi Lokasi Kantor
    const [lokasiKantorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, nama_kantor, latitude, longitude, radius_meter 
       FROM lokasi_kantor`
    );

    // Lepaskan koneksi
    connection.release();

    // Kembalikan response
    return NextResponse.json({
      success: true,
      data: {
        presensi: {
          totalHadirHariIni,
        },
        karyawan: karyawanRows,
        leaveRequests: leaveRequestRows,
        lokasiKantor: lokasiKantorRows,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    if (connection) connection.release();
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}