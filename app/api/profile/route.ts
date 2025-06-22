/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/utils/db';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profiles');
const BASE_URL = '/uploads/profiles';

interface UserProfile extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  role: string;
  karyawan_id?: number;
  nama?: string;
  foto_profile?: string;
  no_telepon?: string;
  nik?: string;
  alamat?: string;
  status?: string;
  tanggal_bergabung?: string;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

async function authorize(req: NextRequest): Promise<{ user: any } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { user: payload };
}

async function handleFileUpload(fileData: string | null, existingFotoProfile: string | null): Promise<string | null> {
  if (!fileData || !fileData.startsWith('data:image')) return existingFotoProfile;

  try {
    const matches = fileData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error('Format base64 gambar tidak valid');

    const imageType = matches[1];
    const base64Data = matches[2];

    // Validasi tipe file
    const allowedTypes = ['jpeg', 'png', 'gif', 'webp'];
    if (!allowedTypes.includes(imageType)) {
      throw new Error('Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)');
    }

    // Validasi ukuran file (max 2MB)
    const buffer = Buffer.from(base64Data, 'base64');
    const maxSize = 2 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new Error('Ukuran file terlalu besar. Maksimal 2MB');
    }

    // Buat nama file unik
    const timestamp = Date.now();
    const filename = `profile_${timestamp}.${imageType}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Buat direktori jika belum ada
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Simpan file baru
    await fs.writeFile(filePath, buffer);

    // Hapus file lama jika ada
    if (existingFotoProfile) {
      const oldFilePath = path.join(process.cwd(), 'public', existingFotoProfile);
      try {
        await fs.access(oldFilePath);
        await fs.unlink(oldFilePath);
      } catch {
        // File lama tidak ada, lanjutkan tanpa error
        console.warn('File lama tidak ditemukan:', oldFilePath);
      }
    }

    return `${BASE_URL}/${filename}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan' }), { status: 401, headers });
  }

  try {
    const { user_id, role } = auth.user;

    // Ambil data profil dari tabel users dan karyawan
    const [userRows] = await pool.query<UserProfile[]>(
      `SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        u.role,
        k.id AS karyawan_id,
        k.nama,
        k.foto_profile,
        k.no_telepon,
        k.nik,
        k.alamat,
        k.status,
        k.tanggal_bergabung
      FROM users u
      LEFT JOIN karyawan k ON u.id = k.user_id
      WHERE u.id = ?`,
      [user_id]
    );

    if (!userRows.length) {
      return new NextResponse(JSON.stringify({ message: 'Pengguna tidak ditemukan' }), { status: 404, headers });
    }

    const userProfile = userRows[0];
    const additionalData: any = {};

    // Tambahkan data khusus untuk karyawan
    if (role === 'karyawan' && userProfile.karyawan_id) {
      const [leaveRequests] = await pool.query<RowDataPacket[]>(
        `SELECT 
          id AS leave_id,
          jenis,
          tanggal_mulai,
          tanggal_selesai,
          status AS status_pengajuan,
          keterangan,
          foto_bukti
        FROM leave_requests
        WHERE karyawan_id = ?
        ORDER BY tanggal_mulai DESC
        LIMIT 5`,
        [userProfile.karyawan_id]
      );
      additionalData.leave_requests = leaveRequests;

      const [presensi] = await pool.query<RowDataPacket[]>(
        `SELECT 
          tanggal,
          checkin_time,
          checkout_time,
          status,
          keterangan
        FROM presensi
        WHERE karyawan_id = ?
        ORDER BY tanggal DESC
        LIMIT 5`,
        [userProfile.karyawan_id]
      );
      additionalData.presensi = presensi;
    }

    // Tambahkan data khusus untuk supervisor
    if (role === 'supervisor') {
      const [supervisedEmployees] = await pool.query<RowDataPacket[]>(
        `SELECT 
          k.id AS karyawan_id,
          k.nama
        FROM karyawan k
        WHERE k.supervisor_id = ?`,
        [userProfile.karyawan_id || user_id]
      );
      additionalData.supervised_employees = supervisedEmployees;
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Data profil berhasil diambil',
        user: userProfile,
        ...additionalData,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal mengambil data profil' }),
      { status: 500, headers }
    );
  }
}

export async function PUT(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan' }), { status: 401, headers });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { user_id, role, karyawan_id } = auth.user;
    const data = await req.json();
    const { email, username, nama, foto_profile, no_telepon, alamat } = data;

    // Validasi email unik
    if (email) {
      const [existingEmail] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, user_id]
      );
      if (existingEmail.length > 0) {
        connection.release();
        return new NextResponse(JSON.stringify({ message: 'Email sudah digunakan' }), { status: 400, headers });
      }
    }

    // Ambil foto profil lama untuk karyawan
    let existingFotoProfile: string | null = null;
    if (role === 'karyawan' && karyawan_id) {
      const [existingData] = await connection.query<RowDataPacket[]>(
        'SELECT foto_profile FROM karyawan WHERE id = ?',
        [karyawan_id]
      );
      existingFotoProfile = existingData.length > 0 ? existingData[0].foto_profile : null;
    }

    // Tangani unggahan foto profil
    const fotoProfilePath = await handleFileUpload(foto_profile, existingFotoProfile);

    // Perbarui tabel users
    if (email || username) {
      const [userResult] = await connection.execute<ResultSetHeader>(
        'UPDATE users SET email = ?, username = ? WHERE id = ?',
        [email || null, username || null, user_id]
      );
      if (userResult.affectedRows === 0) {
        throw new Error('Pengguna tidak ditemukan');
      }
    }

    // Perbarui tabel karyawan untuk role karyawan
    if (role === 'karyawan' && karyawan_id && (nama || fotoProfilePath || no_telepon || alamat)) {
      const [karyawanResult] = await connection.execute<ResultSetHeader>(
        'UPDATE karyawan SET nama = ?, foto_profile = ?, no_telepon = ?, alamat = ? WHERE id = ?',
        [nama || null, fotoProfilePath || null, no_telepon || null, alamat || null, karyawan_id]
      );
      if (karyawanResult.affectedRows === 0) {
        throw new Error('Karyawan tidak ditemukan');
      }
    }

    await connection.commit();
    connection.release();

    return new NextResponse(
      JSON.stringify({
        message: 'Profil berhasil diperbarui',
        updated_data: {
          email,
          username,
          nama,
          foto_profile: fotoProfilePath,
          no_telepon,
          alamat,
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error updating profile:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal memperbarui profil', error: (error as Error).message }),
      { status: 500, headers }
    );
  }
}