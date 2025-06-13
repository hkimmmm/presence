import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/app/utils/db';
import { RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';

interface UserKaryawan extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  karyawan_id: number;
  nama: string;
  nik: string;
  foto_profile: string;
  no_telepon: string;
  status: string;
  tanggal_bergabung: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new NextResponse(
        JSON.stringify({ message: 'Email dan password wajib diisi' }),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    const [rows] = await pool.query<UserKaryawan[]>(
      `SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        u.password,
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
      WHERE u.email = ?
      LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Email tidak terdaftar' }),
        {
          status: 404,
          headers: corsHeaders(),
        }
      );
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return new NextResponse(
        JSON.stringify({ message: 'Password salah' }),
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }

    // Ambil leave_requests jika role adalah karyawan
    let leaveRequests: RowDataPacket[] = [];
    if (user.role === 'karyawan' && user.karyawan_id) {
      const [leaves] = await pool.query<RowDataPacket[]>(
        `SELECT 
          id AS leave_id,
          jenis,
          tanggal_mulai,
          tanggal_selesai,
          status AS status_pengajuan,
          keterangan,
          foto_bukti
        FROM leave_requests
        WHERE karyawan_id = ?`,
        [user.karyawan_id]
      );
      leaveRequests = leaves;
    }

    // Hapus password sebelum kirim ke client
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        karyawan_id: user.karyawan_id,
        foto_profile: user.foto_profile,
        nama: user.nama,  
      },
      JWT_SECRET,
      { expiresIn: '1d' } // token berlaku 1 hari, bisa disesuaikan
    );

    return new NextResponse(
      JSON.stringify({
        message: 'Login berhasil',
        user: userWithoutPassword,
        leave_requests: leaveRequests,
        token, // token JWT dikirim ke client
      }),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error('Error saat login:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Terjadi kesalahan pada server' }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}
