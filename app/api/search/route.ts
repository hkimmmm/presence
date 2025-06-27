import { NextResponse } from 'next/server';
import pool from '@/app/utils/db';
import { RowDataPacket } from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// CORS Configuration
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

interface SearchResult {
  type: string;
  title: string;
  url: string;
}

interface JwtPayload {
  user_id: number;
  username: string;
  role: string;
  karyawan_id?: number;
  foto_profile?: string;
  nama?: string;
  iat?: number;
  exp?: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.toLowerCase() || '';

    if (!q || q.length < 2) {
      return withCors(NextResponse.json({ results: [] }, { status: 200 }));
    }

    // Dapatkan token dari cookie
    let token: string | undefined;
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    // Verifikasi token
    let userRole: string | null = null;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      userRole = decoded.role;
    } catch {
      return withCors(NextResponse.json({ error: 'Invalid token' }, { status: 401 }));
    }

    if (!userRole) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const results: SearchResult[] = [];

    // 1. Cari Karyawan
    const [employeeRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT k.id, k.nama, k.status, u.role
        FROM karyawan k
        LEFT JOIN users u ON k.user_id = u.id
        WHERE LOWER(k.nama) LIKE ? OR LOWER(k.nik) LIKE ? OR LOWER(k.email) LIKE ?
        LIMIT 5
      `,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    results.push(
      ...employeeRows.map((row) => ({
        type: 'employee',
        title: `${row.nama} (${row.role || 'Karyawan'}, ${row.status})`,
        url: `/dashboard/employee/${row.id}`,
      }))
    );

    // 2. Cari Pengguna
    const [userRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT id, username, email, role
        FROM users
        WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ?
        LIMIT 5
      `,
      [`%${q}%`, `%${q}%`]
    );
    results.push(
      ...userRows.map((row) => ({
        type: 'user',
        title: `${row.username} (${row.role})`,
        url: userRole === 'supervisor' || userRole === row.role ? `/supervisor/users/${row.id}` : `/dashboard/users/${row.id}`,
      }))
    );

    // 3. Cari Permintaan Cuti
    const [leaveRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT lr.id, k.nama, lr.jenis, lr.status
        FROM leave_requests lr
        JOIN karyawan k ON lr.karyawan_id = k.id
        WHERE LOWER(k.nama) LIKE ? OR LOWER(lr.jenis) LIKE ? OR LOWER(lr.status) LIKE ?
        LIMIT 5
      `,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    results.push(
      ...leaveRows.map((row) => ({
        type: 'leave',
        title: `${row.jenis} ${row.nama} (${row.status})`,
        url: `/dashboard/leave/${row.id}`,
      }))
    );

    // 4. Cari Presensi
    // Validasi jika q adalah tanggal yang valid
    let dateCondition = '';
    const params = [`%${q}%`, `%${q}%`]; // Default untuk LIKE
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Format YYYY-MM-DD
    if (dateRegex.test(q)) {
      dateCondition = 'OR DATE(p.tanggal) = ?';
      params.push(q);
    }

    const [attendanceRows] = await pool.query<RowDataPacket[]>(
      `
        SELECT p.id, k.nama, p.tanggal, p.status
        FROM presensi p
        JOIN karyawan k ON p.karyawan_id = k.id
        WHERE LOWER(k.nama) LIKE ? ${dateCondition} OR LOWER(p.status) LIKE ?
        LIMIT 5
      `,
      params
    );
    results.push(
      ...attendanceRows.map((row) => ({
        type: 'attendance',
        title: `${row.status} ${row.nama} (${new Date(row.tanggal).toLocaleDateString('id-ID')})`,
        url: `/dashboard/presensi/${row.id}`,
      }))
    );

    // 5. Halaman Statis (hardcoded)
    const staticPages = [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Supervisor', url: '/supervisor' },
    ].filter((page) => page.title.toLowerCase().includes(q));
    const filteredStaticPages = staticPages.filter((page) =>
      userRole === 'supervisor' || page.url !== '/supervisor'
    );
    results.push(
      ...filteredStaticPages.map((page) => ({
        type: 'page',
        title: page.title,
        url: page.url,
      }))
    );

    // Filter hasil untuk menghapus URL supervisor jika bukan supervisor
    const filteredResults = results.filter((result) =>
      userRole === 'supervisor' || !result.url.startsWith('/supervisor')
    );

    return withCors(NextResponse.json({ results: filteredResults }, { status: 200 }));
  } catch (error) {
    console.error('❌ Error saat pencarian:', error);
    return withCors(
      NextResponse.json({ error: (error as Error).message }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: CORS_HEADERS,
  });
}