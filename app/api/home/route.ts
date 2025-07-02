import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

interface DashboardResponse {
  success?: boolean;
  data?: {
    presensi: {
      totalHadirHariIni: number;
    };
    karyawan: {
      id: number;
      nama: string;
      email: string;
      no_telepon: string;
      tanggal_bergabung: Date;
    }[];
    leaveRequests: {
      id: number;
      jenis: string;
      tanggal_mulai: Date;
      tanggal_selesai: Date;
      keterangan: string | null;
      karyawan_nama: string;
    }[];
    lokasiKantor: {
      id: number;
      nama_kantor: string;
      latitude: number;
      longitude: number;
      radius_meter: number;
    }[];
  };
  error?: string;
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  const token = req.cookies.get('token')?.value;
  return token || null;
}

interface DecodedToken {
  id: number;
  role: string;
  [key: string]: unknown;
}

function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Ambil dan verifikasi token
    const token = getTokenFromRequest(req);
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: No token provided' } as DashboardResponse),
        { status: 401, headers: corsHeaders() }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Invalid token' } as DashboardResponse),
        { status: 401, headers: corsHeaders() }
      );
    }

    // Batasi akses untuk admin atau supervisor
    if (decoded.role !== 'admin' && decoded.role !== 'supervisor') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' } as DashboardResponse),
        { status: 403, headers: corsHeaders() }
      );
    }

    // 1. Ringkasan Presensi (jumlah karyawan hadir hari ini)
    const today = new Date().toISOString().split('T')[0];
    const totalHadirHariIni = await prisma.presensi.count({
      where: {
        tanggal: new Date(today),
        status: 'hadir',
      },
    });

    // 2. Daftar Karyawan (karyawan aktif, limit 10)
    const karyawan = await prisma.karyawan.findMany({
      where: { status: 'aktif' },
      select: {
        id: true,
        nama: true,
        email: true,
        no_telepon: true,
        tanggal_bergabung: true,
      },
      take: 10,
    });

    // 3. Permintaan Cuti (status pending, limit 5)
    const leaveRequests = await prisma.leave_requests.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        jenis: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        keterangan: true,
        karyawan: {
          select: { nama: true },
        },
      },
      take: 5,
    });

    // 4. Informasi Lokasi Kantor
    const lokasiKantor = await prisma.lokasi_kantor.findMany({
      select: {
        id: true,
        nama_kantor: true,
        latitude: true,
        longitude: true,
        radius_meter: true,
      },
    });

    // Format respons
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          presensi: { totalHadirHariIni },
          karyawan,
          leaveRequests: leaveRequests.map(lr => ({
            id: lr.id,
            jenis: lr.jenis,
            tanggal_mulai: lr.tanggal_mulai,
            tanggal_selesai: lr.tanggal_selesai,
            keterangan: lr.keterangan,
            karyawan_nama: lr.karyawan.nama,
          })),
          lokasiKantor: lokasiKantor.map(lk => ({
            id: typeof lk.id === 'bigint' ? Number(lk.id) : lk.id,
            nama_kantor: lk.nama_kantor,
            latitude: typeof lk.latitude === 'object' && 'toNumber' in lk.latitude ? lk.latitude.toNumber() : lk.latitude,
            longitude: typeof lk.longitude === 'object' && 'toNumber' in lk.longitude ? lk.longitude.toNumber() : lk.longitude,
            radius_meter: lk.radius_meter,
          })),
        },
      } as DashboardResponse),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' } as DashboardResponse),
      { status: 500, headers: corsHeaders() }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}