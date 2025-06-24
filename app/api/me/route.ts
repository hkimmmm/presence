// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import pool from '@/app/utils/db';
import { RowDataPacket } from 'mysql2/promise';

interface UserKaryawan extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  role: string;
  karyawan_id: number;
  nama: string;
  nik: string;
  foto_profile: string;
  no_telepon: string;
  status: string;
  tanggal_bergabung: string;
}

interface TokenPayload {
  user_id: number;
  username: string;
  role: string;
  karyawan_id: number;
  foto_profile: string;
  nama: string;
}

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      return new NextResponse(
        JSON.stringify({ message: 'No token provided' }),
        { status: 401 }
      );
    }

    // Verifikasi token
    const decoded = verify(token, JWT_SECRET) as TokenPayload;

    // Ambil data pengguna dari database
    const [rows] = await pool.query<UserKaryawan[]>(
      `SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        u.role,
        k.id AS karyawan_id,
        k.nama,
        k.nik,
        k.foto_profile,
        k.no_telepon,
        k.status,
        k.tanggal_bergabung
      FROM users u
      LEFT JOIN karyawan k ON u.id = k.user_id
      WHERE u.id = ?
      LIMIT 1`,
      [decoded.user_id]
    );

    if (rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'User not found' }),
        { status: 404 }
      );
    }

    const user = rows[0];
    return new NextResponse(
      JSON.stringify({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        karyawan_id: user.karyawan_id,
        nama: user.nama,
        nik: user.nik,
        foto_profile: user.foto_profile || '/images/default-profile.jpg',
        no_telepon: user.no_telepon,
        status: user.status,
        tanggal_bergabung: user.tanggal_bergabung,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Invalid token or server error' }),
      { status: 401 }
    );
  }
}