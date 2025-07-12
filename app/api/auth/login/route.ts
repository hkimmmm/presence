/* eslint-disable @typescript-eslint/no-explicit-any */
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
    console.log('Request Body:', { email, password: '****' });
    console.log('CLIENT_URL:', process.env.CLIENT_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    if (!email || !inputPassword) {
      return new NextResponse(
        JSON.stringify({ message: 'Email dan password wajib diisi' }),
        { status: 400, headers: corsHeaders() }
      );
    }

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
    console.log('User Query Result:', user ? 'User found' : 'User not found');

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: 'Email tidak terdaftar' }),
        { status: 404, headers: corsHeaders() }
      );
    }

    const isMatch = await bcrypt.compare(inputPassword, user.password);
    if (!isMatch) {
      return new NextResponse(
        JSON.stringify({ message: 'Password salah' }),
        { status: 401, headers: corsHeaders() }
      );
    }

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
      console.log('Leave Requests:', leaveRequests);
    }

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
    console.log('Generated Token:', token);

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
      { status: 200, headers: corsHeaders() }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false,
      domain: process.env.NODE_ENV === 'production' ? '31.97.108.186' : undefined,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 1 hari
    });

    return response;
  } catch (error: any) {
    console.error('Error saat login:', error.message);
    return new NextResponse(
      JSON.stringify({ message: 'Terjadi kesalahan pada server', error: error.message }),
      { status: 500, headers: corsHeaders() }
    );
  }
}

function corsHeaders() {
  console.log('CORS CLIENT_URL:', process.env.CLIENT_URL);
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'https://app.citrabuana.online',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Access-Control-Max-Age': '86400', // Cache CORS headers selama 1 hari
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}