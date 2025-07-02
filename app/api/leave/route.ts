/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

interface LeaveRequest {
  id?: number;
  karyawan_id: number;
  jenis: 'cuti' | 'sakit' | 'dinas';
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  status?: 'pending' | 'approved' | 'rejected';
  keterangan?: string | null;
  foto_bukti?: string | null;
  approved_by?: number | null;
  created_at?: Date;
  karyawan_nama?: string;
  approver_username?: string | null;
}

interface LeaveRequestUpdate {
  id: number;
  status: 'approved' | 'rejected';
  approved_by: number;
}

interface LeaveRequestResponse {
  message: string;
  id?: number;
}

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'proof');
const BASE_URL = '/uploads/proof';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders() });
}

function validateLeaveRequest(data: Partial<LeaveRequest>): data is LeaveRequest {
  if (!data.karyawan_id || !data.jenis || !data.tanggal_mulai || !data.tanggal_selesai) {
    return false;
  }

  const validJenis = ['cuti', 'sakit', 'dinas'].includes(data.jenis);
  const startDate = new Date(data.tanggal_mulai);
  const endDate = new Date(data.tanggal_selesai);

  return validJenis && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate <= endDate;
}

async function handleFileUpload(fileData: string | null): Promise<string | null> {
  if (!fileData) return null;

  if (fileData.startsWith(BASE_URL)) return fileData;

  if (fileData.startsWith('data:image')) {
    try {
      const matches = fileData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches || matches.length !== 3) throw new Error('Invalid image data format');

      const ext = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, 'base64');

      if (buffer.length > 5 * 1024 * 1024) throw new Error('File size exceeds 5MB');

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      const filename = `proof_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.writeFile(filePath, buffer);

      return `${BASE_URL}/${filename}`;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  }

  return null;
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  const token = req.cookies.get('token')?.value;
  return token || null;
}

function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return new NextResponse(
      JSON.stringify({ message: 'Tidak diizinkan: Token tidak valid' } as LeaveRequestResponse),
      { status: 401, headers: corsHeaders() }
    );
  }

  try {
    const { role, karyawan_id } = payload;

    const whereClause: any = {};
    if (role === 'karyawan' || role === 'sales') {
      whereClause.karyawan_id = karyawan_id;
    } else if (role === 'supervisor') {
      whereClause.karyawan = { users: { role: 'karyawan' } };
    } else if (role !== 'admin') {
      return new NextResponse(
        JSON.stringify({ message: 'Akses ditolak: Role tidak diizinkan' } as LeaveRequestResponse),
        { status: 403, headers: corsHeaders() }
      );
    }

    const leaveRequests = await prisma.leave_requests.findMany({
      where: whereClause,
      select: {
        id: true,
        karyawan_id: true,
        jenis: true,
        tanggal_mulai: true,
        tanggal_selesai: true,
        status: true,
        keterangan: true,
        foto_bukti: true,
        approved_by: true,
        created_at: true,
        karyawan: { select: { nama: true } },
        users: { select: { username: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const formattedLeaveRequests = leaveRequests.map(lr => ({
      id: lr.id,
      karyawan_id: lr.karyawan_id,
      jenis: lr.jenis,
      tanggal_mulai: lr.tanggal_mulai,
      tanggal_selesai: lr.tanggal_selesai,
      status: lr.status,
      keterangan: lr.keterangan,
      foto_bukti: lr.foto_bukti,
      approved_by: lr.approved_by,
      created_at: lr.created_at,
      karyawan_nama: lr.karyawan.nama,
      approver_username: lr.users?.username || null,
    }));

    return new NextResponse(JSON.stringify(formattedLeaveRequests), { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal mengambil data cuti. Silakan coba lagi nanti.' } as LeaveRequestResponse),
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return new NextResponse(
      JSON.stringify({ message: 'Tidak diizinkan: Token tidak valid' } as LeaveRequestResponse),
      { status: 401, headers: corsHeaders() }
    );
  }

  const { karyawan_id, role } = payload;

  if (role !== 'karyawan' && role !== 'sales') {
    return new NextResponse(
      JSON.stringify({ message: 'Akses ditolak: Hanya karyawan dan sales yang bisa mengajukan cuti' } as LeaveRequestResponse),
      { status: 403, headers: corsHeaders() }
    );
  }

  try {
    const data: Partial<LeaveRequest> = await request.json();
    data.karyawan_id = karyawan_id;

    if (!validateLeaveRequest(data)) {
      return new NextResponse(
        JSON.stringify({ message: 'Data permintaan cuti tidak valid. Pastikan semua kolom wajib diisi dengan benar.' } as LeaveRequestResponse),
        { status: 400, headers: corsHeaders() }
      );
    }

    const fotoBuktiUrl = await handleFileUpload(data.foto_bukti || null);

    const result = await prisma.$transaction(async (tx) => {
      const leave = await tx.leave_requests.create({
        data: {
          karyawan_id: data.karyawan_id!,
          jenis: data.jenis!,
          tanggal_mulai: new Date(data.tanggal_mulai!),
          tanggal_selesai: new Date(data.tanggal_selesai!),
          keterangan: data.keterangan || null,
          foto_bukti: fotoBuktiUrl,
          status: 'pending',
        },
        select: { id: true },
      });

      const startDate = new Date(data.tanggal_mulai!);
      const endDate = new Date(data.tanggal_selesai!);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const tanggal = currentDate.toISOString().split('T')[0];
        const existingPresensi = await tx.presensi.findFirst({
          where: { karyawan_id: data.karyawan_id!, tanggal: new Date(tanggal) },
          select: { id: true },
        });

        if (!existingPresensi) {
          await tx.presensi.create({
            data: {
              karyawan_id: data.karyawan_id!,
              tanggal: new Date(tanggal),
              status: data.jenis!,
              keterangan: data.keterangan || null,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return leave;
    });

    return new NextResponse(
      JSON.stringify({ message: 'Permintaan cuti dan presensi berhasil dicatat', id: result.id } as LeaveRequestResponse),
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error saat membuat permintaan cuti atau presensi:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal membuat permintaan cuti. Silakan coba lagi nanti.' } as LeaveRequestResponse),
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !['admin', 'supervisor'].includes(payload.role)) {
    return new NextResponse(
      JSON.stringify({ message: 'Akses ditolak: Hanya admin atau supervisor yang diizinkan' } as LeaveRequestResponse),
      { status: 403, headers: corsHeaders() }
    );
  }

  try {
    const data: Partial<LeaveRequestUpdate> = await request.json();

    if (!data.id || !data.status || !['approved', 'rejected'].includes(data.status)) {
      return new NextResponse(
        JSON.stringify({ message: 'Data pembaruan tidak valid. ID dan status wajib diisi.' } as LeaveRequestResponse),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (payload.role === 'supervisor') {
      const leave = await prisma.leave_requests.findFirst({
        where: {
          id: data.id,
          karyawan: { users: { role: 'karyawan' } },
        },
        select: { id: true },
      });

      if (!leave) {
        return new NextResponse(
          JSON.stringify({ message: 'Akses ditolak: Anda tidak memiliki izin untuk mengupdate cuti ini' } as LeaveRequestResponse),
          { status: 403, headers: corsHeaders() }
        );
      }
    }

    const result = await prisma.leave_requests.update({
      where: { id: data.id },
      data: {
        status: data.status,
        approved_by: payload.user_id,
      },
    });

    if (!result) {
      return new NextResponse(
        JSON.stringify({ message: 'Permintaan cuti tidak ditemukan' } as LeaveRequestResponse),
        { status: 404, headers: corsHeaders() }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: 'Permintaan cuti berhasil diperbarui' } as LeaveRequestResponse),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error updating leave request:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal memperbarui permintaan cuti. Silakan coba lagi nanti.' } as LeaveRequestResponse),
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !['admin', 'supervisor'].includes(payload.role)) {
    return new NextResponse(
      JSON.stringify({ message: 'Akses ditolak: Hanya admin atau supervisor yang diizinkan' } as LeaveRequestResponse),
      { status: 403, headers: corsHeaders() }
    );
  }

  try {
    const { ids }: { ids: number[] } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Data ID tidak valid' } as LeaveRequestResponse),
        { status: 400, headers: corsHeaders() }
      );
    }

    if (payload.role === 'supervisor') {
      const validLeaves = await prisma.leave_requests.findMany({
        where: {
          id: { in: ids },
          karyawan: { users: { role: 'karyawan' } },
        },
        select: { id: true },
      });

      const validIds = validLeaves.map(leave => leave.id);
      if (validIds.length !== ids.length) {
        return new NextResponse(
          JSON.stringify({ message: 'Akses ditolak: Anda tidak memiliki izin untuk menghapus beberapa cuti ini' } as LeaveRequestResponse),
          { status: 403, headers: corsHeaders() }
        );
      }
    }

    const result = await prisma.leave_requests.deleteMany({
      where: { id: { in: ids } },
    });

    if (result.count === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Tidak ada permintaan cuti yang dihapus' } as LeaveRequestResponse),
        { status: 404, headers: corsHeaders() }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: 'Permintaan cuti berhasil dihapus' } as LeaveRequestResponse),
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error deleting leave requests:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal menghapus permintaan cuti. Silakan coba lagi nanti.' } as LeaveRequestResponse),
      { status: 500, headers: corsHeaders() }
    );
  }
}