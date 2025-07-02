import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/utils/prisma';
import jwt from 'jsonwebtoken';

interface UserResponse {
  user_id: number;
  username: string;
  email: string;
  role: string | null;
  karyawan_id?: number;
  nama?: string;
  nik?: string;
  foto_profile?: string | null;
  no_telepon?: string;
  status?: string;
  tanggal_bergabung?: Date;
}

interface LeaveRequestResponse {
  leave_id: number;
  jenis: string;
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  status_pengajuan: string | null;
  keterangan?: string | null;
  foto_bukti?: string | null;
}

// Interface untuk tipe data dari Prisma query
interface PrismaLeaveRequest {
  id: number;
  jenis: string; 
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  status: string | null; 
  keterangan: string | null;
  foto_bukti: string | null;
}

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export async function POST(request: Request) {
  try {
    const { email, password: inputPassword } = await request.json();

    if (!email || !inputPassword) {
      return new NextResponse(
        JSON.stringify({ message: 'Email dan password wajib diisi' }),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Query untuk mencari user berdasarkan email dengan relasi karyawan
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        karyawan: {
          select: {
            id: true,
            nama: true,
            nik: true,
            foto_profile: true,
            no_telepon: true,
            status: true,
            tanggal_bergabung: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: 'Email tidak terdaftar' }),
        {
          status: 404,
          headers: corsHeaders(),
        }
      );
    }

    const isMatch = await bcrypt.compare(inputPassword, user.password);

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
    let leaveRequests: PrismaLeaveRequest[] = [];
    if (user.role === 'karyawan' && user.karyawan?.id) {
      leaveRequests = await prisma.leave_requests.findMany({
        where: { karyawan_id: user.karyawan.id },
        select: {
          id: true,
          jenis: true,
          tanggal_mulai: true,
          tanggal_selesai: true,
          status: true,
          keterangan: true,
          foto_bukti: true,
        },
      });
    }

    // Format respons user tanpa password
    const userWithoutPassword: UserResponse = {
      user_id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      karyawan_id: user.karyawan?.id,
      nama: user.karyawan?.nama,
      nik: user.karyawan?.nik,
      foto_profile: user.karyawan?.foto_profile,
      no_telepon: user.karyawan?.no_telepon,
      status: user.karyawan?.status,
      tanggal_bergabung: user.karyawan?.tanggal_bergabung,
    };

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role: user.role,
        karyawan_id: user.karyawan?.id,
        foto_profile: user.karyawan?.foto_profile,
        nama: user.karyawan?.nama,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const response = new NextResponse(
      JSON.stringify({
        message: 'Login berhasil',
        user: userWithoutPassword,
        leave_requests: leaveRequests.map(lr => ({
          leave_id: lr.id,
          jenis: lr.jenis,
          tanggal_mulai: lr.tanggal_mulai,
          tanggal_selesai: lr.tanggal_selesai,
          status_pengajuan: lr.status,
          keterangan: lr.keterangan,
          foto_bukti: lr.foto_bukti,
        }) as LeaveRequestResponse),
        token,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );

    // Simpan token di cookie httpOnly
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 1 hari
    });

    return response;
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
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
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