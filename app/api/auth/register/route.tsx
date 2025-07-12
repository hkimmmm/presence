import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/utils/prisma';

interface RegisterResponse {
  message: string;
  userId?: number;
}

export async function POST(request: Request) {
  try {
    const { username, email, password, role, nik, nama, no_telepon, alamat } = await request.json();

    if (!username || !email || !password || !role) {
      return new NextResponse(
        JSON.stringify({ message: 'Semua data wajib diisi' } as RegisterResponse),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Cek apakah email sudah digunakan
    const existingUser = await prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return new NextResponse(
        JSON.stringify({ message: 'Email sudah digunakan' } as RegisterResponse),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert ke tabel users
    const user = await prisma.users.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role as 'admin' | 'sales' | 'supervisor' | 'karyawan',
      },
      select: { id: true },
    });

    const userId = user.id;

    // Jika role adalah karyawan atau sales, tambahkan ke tabel karyawan
    if (role === 'karyawan' || role === 'sales') {
      if (!nik || !nama || !no_telepon || !alamat) {
        return new NextResponse(
          JSON.stringify({ message: 'Data karyawan wajib diisi' } as RegisterResponse),
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }

      // Cek apakah NIK sudah terdaftar
      const existingKaryawan = await prisma.karyawan.findUnique({
        where: { nik },
        select: { id: true },
      });

      if (existingKaryawan) {
        return new NextResponse(
          JSON.stringify({ message: 'NIK sudah terdaftar' } as RegisterResponse),
          {
            status: 400,
            headers: corsHeaders(),
          }
        );
      }

      await prisma.karyawan.create({
        data: {
          user_id: userId,
          nik,
          nama,
          email,
          no_telepon,
          alamat,
          status: 'aktif',
        },
      });
    }

    return new NextResponse(
      JSON.stringify({ message: 'User berhasil didaftarkan', userId } as RegisterResponse),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error('Error saat registrasi:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Terjadi kesalahan server' } as RegisterResponse),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'https://app.citrabuana.online',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}