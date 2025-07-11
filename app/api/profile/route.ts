/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/app/utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'profiles');
const BASE_URL = '/uploads/profiles';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'https://31.97.108.186',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
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

async function authorize(req: NextRequest): Promise<{ user: any } | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return { user: payload };
}

async function handleFileUpload(
  fileData: string | null,
  existingFotoProfile: string | null
): Promise<string | null> {
  if (!fileData || !fileData.startsWith('data:image')) return existingFotoProfile;

  const matches = fileData.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches || matches.length !== 3) throw new Error('Format base64 gambar tidak valid');

  const imageType = matches[1];
  const base64Data = matches[2];

  const allowedTypes = ['jpeg', 'png', 'gif', 'webp'];
  if (!allowedTypes.includes(imageType)) {
    throw new Error('Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const maxSize = 2 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error('Ukuran file terlalu besar. Maksimal 2MB');
  }

  const timestamp = Date.now();
  const filename = `profile_${timestamp}.${imageType}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(filePath, buffer);

  if (existingFotoProfile) {
    const oldFilePath = path.join(process.cwd(), 'public', existingFotoProfile);
    try {
      await fs.access(oldFilePath);
      await fs.unlink(oldFilePath);
    } catch {
      console.warn('File lama tidak ditemukan:', oldFilePath);
    }
  }

  return `${BASE_URL}/${filename}`;
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan' }), { status: 401, headers });
  }

  try {
    const { user_id, role } = auth.user;

    const userProfile = await prisma.users.findUnique({
      where: { id: user_id },
      include: { karyawan: true }
    });

    if (!userProfile) {
      return new NextResponse(JSON.stringify({ message: 'Pengguna tidak ditemukan' }), { status: 404, headers });
    }

    const user = {
      user_id: userProfile.id,
      username: userProfile.username,
      email: userProfile.email,
      role: userProfile.role,
      karyawan_id: userProfile.karyawan?.id,
      nama: userProfile.karyawan?.nama,
      foto_profile: userProfile.karyawan?.foto_profile,
      no_telepon: userProfile.karyawan?.no_telepon,
      nik: userProfile.karyawan?.nik,
      alamat: userProfile.karyawan?.alamat,
      status: userProfile.karyawan?.status,
      tanggal_bergabung: userProfile.karyawan?.tanggal_bergabung
    };

    const additionalData: any = {};

    if (role === 'karyawan' && user.karyawan_id) {
      additionalData.leave_requests = await prisma.leave_requests.findMany({
        where: { karyawan_id: user.karyawan_id },
        orderBy: { tanggal_mulai: 'desc' },
        take: 5
      });

      additionalData.presensi = await prisma.presensi.findMany({
        where: { karyawan_id: user.karyawan_id },
        orderBy: { tanggal: 'desc' },
        take: 5
      });
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Data profil berhasil diambil',
        user,
        ...additionalData,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal mengambil data profil' }),
      { status: 500, headers }
    );
  }
}

export async function PUT(req: NextRequest) {
  const headers = corsHeaders();
  const auth = await authorize(req);
  if (!auth) {
    return new NextResponse(JSON.stringify({ message: 'Tidak diizinkan' }), { status: 401, headers });
  }

  try {
    const { user_id, role, karyawan_id } = auth.user;
    const data = await req.json();
    const { email, username, nama, foto_profile, no_telepon, alamat } = data;

    if (email) {
      const existingEmail = await prisma.users.findFirst({
        where: {
          email,
          NOT: { id: user_id }
        }
      });
      if (existingEmail) {
        return new NextResponse(JSON.stringify({ message: 'Email sudah digunakan' }), { status: 400, headers });
      }
    }

    let existingFotoProfile: string | null = null;
    if (role === 'karyawan' && karyawan_id) {
      const karyawan = await prisma.karyawan.findUnique({ where: { id: karyawan_id } });
      existingFotoProfile = karyawan?.foto_profile || null;
    }

    const fotoProfilePath = await handleFileUpload(foto_profile, existingFotoProfile);

    if (email || username) {
      await prisma.users.update({
        where: { id: user_id },
        data: {
          email: email || undefined,
          username: username || undefined
        }
      });
    }

    if (role === 'karyawan' && karyawan_id && (nama || fotoProfilePath || no_telepon || alamat)) {
      await prisma.karyawan.update({
        where: { id: karyawan_id },
        data: {
          nama: nama || undefined,
          foto_profile: fotoProfilePath || undefined,
          no_telepon: no_telepon || undefined,
          alamat: alamat || undefined
        }
      });
    }

    return new NextResponse(
      JSON.stringify({
        message: 'Profil berhasil diperbarui',
        updated_data: {
          email,
          username,
          nama,
          foto_profile: fotoProfilePath,
          no_telepon,
          alamat,
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Gagal memperbarui profil', error: (error as Error).message }),
      { status: 500, headers }
    );
  }
}
