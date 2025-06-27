/* eslint-disable @typescript-eslint/no-explicit-any */
import pool from '@/app/utils/db';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

interface LeaveRequest extends RowDataPacket {
  id?: number;
  karyawan_id: number;
  jenis: 'cuti' | 'sakit' | 'dinas';
  tanggal_mulai: string;
  tanggal_selesai: string;
  status?: 'pending' | 'approved' | 'rejected';
  keterangan?: string | null;
  foto_bukti?: string | null;
  approved_by?: number | null;
  created_at?: string;
}

interface LeaveRequestUpdate {
  id: number;
  status: 'approved' | 'rejected';
  approved_by: number;
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
    return NextResponse.json({ message: 'Tidak diizinkan: Token tidak valid' }, { status: 401, headers: corsHeaders() });
  }

  try {
    const { role, karyawan_id } = payload;

    let query = `
      SELECT 
        lr.*,
        k.nama AS karyawan_nama,
        u.username AS approver_username
      FROM leave_requests lr
      JOIN karyawan k ON lr.karyawan_id = k.id
      LEFT JOIN users u ON lr.approved_by = u.id
      JOIN users u_k ON k.user_id = u_k.id
    `;
    const params: any[] = [];

    if (role === 'karyawan' || role === 'sales') {
      query += ' WHERE lr.karyawan_id = ?';
      params.push(karyawan_id);
    } else if (role === 'supervisor') {
      // Filter cuti dari pengguna dengan role 'karyawan'
      query += ' WHERE u_k.role = ?';
      params.push('karyawan');
    } else if (role !== 'admin') {
      return NextResponse.json({ message: 'Akses ditolak: Role tidak diizinkan' }, { status: 403, headers: corsHeaders() });
    }

    query += ' ORDER BY lr.created_at DESC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return NextResponse.json(rows, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data cuti. Silakan coba lagi nanti.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'Tidak diizinkan: Token tidak valid' }, { status: 401, headers: corsHeaders() });
  }

  const { karyawan_id, role } = payload;

  // Hanya karyawan & sales yang bisa mengajukan cuti
  if (role !== 'karyawan' && role !== 'sales') {
    return NextResponse.json({ message: 'Akses ditolak: Hanya karyawan dan sales yang bisa mengajukan cuti' }, { status: 403, headers: corsHeaders() });
  }

  try {
    const data: Partial<LeaveRequest> = await request.json();
    data.karyawan_id = karyawan_id;

    if (!validateLeaveRequest(data)) {
      return NextResponse.json(
        { message: 'Data permintaan cuti tidak valid. Pastikan semua kolom wajib diisi dengan benar.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const fotoBuktiUrl = await handleFileUpload(data.foto_bukti || null);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [leaveResult] = await connection.execute<ResultSetHeader>(
        'INSERT INTO leave_requests (karyawan_id, jenis, tanggal_mulai, tanggal_selesai, keterangan, foto_bukti) VALUES (?, ?, ?, ?, ?, ?)',
        [
          data.karyawan_id,
          data.jenis,
          data.tanggal_mulai,
          data.tanggal_selesai,
          data.keterangan || null,
          fotoBuktiUrl,
        ]
      );

      const startDate = new Date(data.tanggal_mulai);
      const endDate = new Date(data.tanggal_selesai);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const tanggal = currentDate.toISOString().split('T')[0];
        const [existingPresensi]: any = await connection.query(
          'SELECT id FROM presensi WHERE karyawan_id = ? AND tanggal = ?',
          [data.karyawan_id, tanggal]
        );
        if (existingPresensi.length === 0) {
          await connection.execute(
            'INSERT INTO presensi (karyawan_id, tanggal, status, keterangan, checkin_time, checkout_time, checkin_lat, checkin_lng, checkout_lat, checkout_lng, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
              data.karyawan_id,
              tanggal,
              data.jenis,
              data.keterangan || null,
              null,
              null,
              null,
              null,
              null,
              null,
            ]
          );
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await connection.commit();
      connection.release();

      return NextResponse.json(
        { message: 'Permintaan cuti dan presensi berhasil dicatat', id: leaveResult.insertId },
        { status: 201, headers: corsHeaders() }
      );
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error saat membuat permintaan cuti atau presensi:', error);
    return NextResponse.json(
      { message: 'Gagal membuat permintaan cuti. Silakan coba lagi nanti.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !['admin', 'supervisor'].includes(payload.role)) {
    return NextResponse.json({ message: 'Akses ditolak: Hanya admin atau supervisor yang diizinkan' }, { status: 403, headers: corsHeaders() });
  }

  try {
    const data: Partial<LeaveRequestUpdate> = await request.json();

    if (!data.id || !data.status || !['approved', 'rejected'].includes(data.status)) {
      return NextResponse.json(
        { message: 'Data pembaruan tidak valid. ID dan status wajib diisi.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Jika role adalah supervisor, pastikan hanya mengupdate cuti dari karyawan dengan role 'karyawan'
    if (payload.role === 'supervisor') {
      const [leave]: any = await pool.query(
        'SELECT lr.karyawan_id FROM leave_requests lr JOIN karyawan k ON lr.karyawan_id = k.id JOIN users u ON k.user_id = u.id WHERE lr.id = ? AND u.role = ?',
        [data.id, 'karyawan']
      );
      if (leave.length === 0) {
        return NextResponse.json(
          { message: 'Akses ditolak: Anda tidak memiliki izin untuk mengupdate cuti ini' },
          { status: 403, headers: corsHeaders() }
        );
      }
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?',
      [data.status, payload.user_id, data.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Permintaan cuti tidak ditemukan' }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({ message: 'Permintaan cuti berhasil diperbarui' }, { status: 200, headers: corsHeaders() });
  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { message: 'Gagal memperbarui permintaan cuti. Silakan coba lagi nanti.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !['admin', 'supervisor'].includes(payload.role)) {
    return NextResponse.json({ message: 'Akses ditolak: Hanya admin atau supervisor yang diizinkan' }, { status: 403, headers: corsHeaders() });
  }

  try {
    const { ids }: { ids: number[] } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Data ID tidak valid' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Jika role adalah supervisor, pastikan hanya menghapus cuti dari karyawan dengan role 'karyawan'
    if (payload.role === 'supervisor') {
      const [validLeaves]: any = await pool.query(
        'SELECT lr.id FROM leave_requests lr JOIN karyawan k ON lr.karyawan_id = k.id JOIN users u ON k.user_id = u.id WHERE lr.id IN (?) AND u.role = ?',
        [ids, 'karyawan']
      );
      const validIds = validLeaves.map((leave: any) => leave.id);
      if (validIds.length !== ids.length) {
        return NextResponse.json(
          { message: 'Akses ditolak: Anda tidak memiliki izin untuk menghapus beberapa cuti ini' },
          { status: 403, headers: corsHeaders() }
        );
      }
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM leave_requests WHERE id IN (?)',
      [ids]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Tidak ada permintaan cuti yang dihapus' }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({ message: 'Permintaan cuti berhasil dihapus' }, { status: 200, headers: corsHeaders() });
  } catch (error) {
    console.error('Error deleting leave requests:', error);
    return NextResponse.json(
      { message: 'Gagal menghapus permintaan cuti. Silakan coba lagi nanti.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}