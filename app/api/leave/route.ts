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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}

function validateLeaveRequest(data: Partial<LeaveRequest>): data is LeaveRequest {
  if (!data.karyawan_id || !data.jenis || !data.tanggal_mulai || !data.tanggal_selesai) {
    return false;
  }

  const validJenis = ['cuti', 'sakit', 'dinas'].includes(data.jenis);
  const startDate = new Date(data.tanggal_mulai);
  const endDate = new Date(data.tanggal_selesai);

  return validJenis && startDate <= endDate;
}

async function handleFileUpload(fileData: string | null): Promise<string | null> {
  if (!fileData) return null;

  if (fileData.startsWith(BASE_URL)) return fileData;

  if (fileData.startsWith('data:image')) {
    try {
      const matches = fileData.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches || matches.length !== 3) throw new Error('Invalid image data');

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

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
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
    `;

    const params: any[] = [];

    if (role === 'karyawan') {
      query += ' WHERE lr.karyawan_id = ?';
      params.push(karyawan_id);
    }

    query += ' ORDER BY lr.created_at DESC';

    const [rows] = await pool.query(query, params);
    return NextResponse.json(rows, { headers: corsHeaders() });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { message: 'Error fetching leave requests' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const { karyawan_id } = payload;

  try {
    const data: Partial<LeaveRequest> = await request.json();
    data.karyawan_id = karyawan_id;

    if (!validateLeaveRequest(data)) {
      return NextResponse.json(
        { message: 'Invalid leave request data' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const fotoBuktiUrl = await handleFileUpload(data.foto_bukti || null);

    const [result] = await pool.execute<ResultSetHeader>(
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

    return NextResponse.json(
      { message: 'Leave request created successfully', id: result.insertId },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Error creating leave request' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

export async function PUT(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;

  if (!payload || !['admin', 'atasan'].includes(payload.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403, headers: corsHeaders() });
  }

  try {
    const data: Partial<LeaveRequestUpdate> = await request.json();

    if (!data.id || !data.status || !['approved', 'rejected'].includes(data.status)) {
      return NextResponse.json(
        { message: 'Invalid update data' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?',
      [data.status, payload.user_id, data.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404, headers: corsHeaders() });
    }

    return NextResponse.json({ message: 'Leave request updated successfully' }, { status: 200, headers: corsHeaders() });
  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { message: 'Error updating leave request' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
