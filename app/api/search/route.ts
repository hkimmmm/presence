/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// CORS Headers
const CORS_HEADERS = {
 'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
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

    // 🔍 Search karyawan
    // 👇 contoh untuk employee
const employeeRows = await prisma.karyawan.findMany({
  where: {
    OR: [
      { nama: { contains: q } },
      { nik: { contains: q } },
      { email: { contains: q } },
    ],
  },
  include: { users: true },
  take: 5,
});

results.push(
  ...employeeRows.map((row) => ({
    type: 'employee',
    title: `${row.nama} (${row.users?.role || 'Karyawan'}, ${row.status})`,
    url: `/dashboard/employee/${row.id}`,
  }))
);

// 👇 untuk users
const userRows = await prisma.users.findMany({
  where: {
    OR: [
      { username: { contains: q } },
      { email: { contains: q } },
    ],
  },
  take: 5,
});

results.push(
  ...userRows.map((row) => ({
    type: 'user',
    title: `${row.username} (${row.role})`,
    url: userRole === 'supervisor' || userRole === row.role
      ? `/supervisor/users/${row.id}`
      : `/dashboard/users/${row.id}`,
  }))
);

// 👇 untuk leave_requests
const leaveWhere: any = {
  OR: [
    { karyawan: { nama: { contains: q } } },
  ],
};

if (['cuti', 'sakit', 'dinas'].includes(q)) {
  leaveWhere.OR.push({ jenis: q as any });
}

if (['pending', 'approved', 'rejected'].includes(q)) {
  leaveWhere.OR.push({ status: q as any });
}

const leaveRows = await prisma.leave_requests.findMany({
  where: leaveWhere,
  include: { karyawan: true },
  take: 5,
});

results.push(
  ...leaveRows.map((row) => ({
    type: 'leave',
    title: `${row.jenis} ${row.karyawan?.nama || ''} (${row.status})`,
    url: `/dashboard/leave/${row.id}`,
  }))
);

// 👇 untuk presensi
const attendanceWhere: any = {
  OR: [
    { karyawan: { nama: { contains: q } } },
    { status: { contains: q } },
  ],
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (dateRegex.test(q)) {
  attendanceWhere.OR.push({ tanggal: new Date(q) });
}

const attendanceRows = await prisma.presensi.findMany({
  where: attendanceWhere,
  include: { karyawan: true },
  take: 5,
});

results.push(
  ...attendanceRows.map((row) => ({
    type: 'attendance',
    title: `${row.status} ${row.karyawan?.nama || ''} (${row.tanggal.toLocaleDateString('id-ID')})`,
    url: `/dashboard/presensi/${row.id}`,
  }))
);


    // 🔍 Static Pages
    const staticPages = [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Supervisor', url: '/supervisor' },
    ].filter((page) => page.title.toLowerCase().includes(q));

    const filteredStaticPages = staticPages.filter(
      (page) => userRole === 'supervisor' || page.url !== '/supervisor'
    );

    results.push(
      ...filteredStaticPages.map((page) => ({
        type: 'page',
        title: page.title,
        url: page.url,
      }))
    );

    // Filter hasil jika bukan supervisor
    const filteredResults = results.filter(
      (result) => userRole === 'supervisor' || !result.url.startsWith('/supervisor')
    );

    return withCors(NextResponse.json({ results: filteredResults }, { status: 200 }));
  } catch (error) {
    console.error('❌ Error during search:', error);
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
