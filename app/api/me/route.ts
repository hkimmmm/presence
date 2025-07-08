import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/app/utils/prisma';

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

    // Ambil data pengguna dari database dengan Prisma
    const user = await prisma.users.findFirst({
      where: { id: decoded.user_id },
      include: { karyawan: true },
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: 'User not found' }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        user_id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        karyawan_id: user.karyawan?.id,
        nama: user.karyawan?.nama,
        nik: user.karyawan?.nik,
        foto_profile: user.karyawan?.foto_profile || '/images/default-profile.jpg',
        no_telepon: user.karyawan?.no_telepon,
        status: user.karyawan?.status,
        tanggal_bergabung: user.karyawan?.tanggal_bergabung.toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new NextResponse(
      JSON.stringify({ message: 'Invalid token or server error' }),
      { status: 401 }
    );
  }
}