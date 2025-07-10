import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface User {
  id?: number;
  user_id?: number;
  foto_profile?: string;
  nik: string;
  nama: string;
  email: string;
  password?: string;
  no_telepon: string;
  alamat: string;
  tanggal_bergabung: string;
  status: 'aktif' | 'nonaktif';
}

interface KaryawanResponse {
  message?: string;
  user_id?: number;
  foto_profile?: string | null;
  updated_data?: Omit<User, 'password'>;
  error?: string;
  details?: string | null;
}

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('foto_profile') as File | null;
    const nik = formData.get('nik') as string;
    const nama = formData.get('nama') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const no_telepon = formData.get('no_telepon') as string;
    const alamat = formData.get('alamat') as string;
    const tanggal_bergabung = formData.get('tanggal_bergabung') as string;
    const status = formData.get('status') as 'aktif' | 'nonaktif';

    if (!nik || !nama || !email || !password || !no_telepon || !alamat || !tanggal_bergabung || !status) {
      return withCors(
        NextResponse.json({ error: 'Semua field wajib diisi' } as KaryawanResponse, { status: 400 })
      );
    }

    let fotoProfilePath: string | null = null;
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return withCors(
          NextResponse.json(
            { error: 'Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)' } as KaryawanResponse,
            { status: 400 }
          )
        );
      }

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        return withCors(
          NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimal 2MB' } as KaryawanResponse, { status: 400 })
        );
      }

      const timestamp = Date.now();
      const ext = path.extname(file.name);
      const filename = `profile_${timestamp}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      const filePath = path.join(uploadDir, filename);

      await fs.mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      fotoProfilePath = `/uploads/profiles/${filename}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          username: nama.toLowerCase().replace(/\s/g, ''),
          email,
          password: hashedPassword,
          role: 'karyawan',
        },
        select: { id: true },
      });

      const karyawan = await tx.karyawan.create({
        data: {
          user_id: user.id,
          foto_profile: fotoProfilePath,
          nik,
          nama,
          email,
          no_telepon,
          alamat,
          tanggal_bergabung: new Date(tanggal_bergabung),
          status,
        },
        select: { id: true },
      });

      return { userId: user.id, karyawanId: karyawan.id };
    });

    console.log('✅ User berhasil ditambahkan dengan ID:', result.userId);
    console.log('✅ Karyawan berhasil ditambahkan dengan ID:', result.karyawanId);

    return withCors(
      NextResponse.json(
        {
          message: 'Karyawan dan User berhasil ditambahkan',
          user_id: result.userId,
          foto_profile: fotoProfilePath,
        } as KaryawanResponse,
        { status: 201 }
      )
    );
  } catch (error) {
    console.error('❌ Error saat menambahkan data:', error);
    return withCors(
      NextResponse.json(
        { error: (error as Error).message, details: error instanceof Error ? error.stack : null } as KaryawanResponse,
        { status: 500 }
      )
    );
  }
}

export async function GET() {
  try {
    const karyawan = await prisma.karyawan.findMany({
      select: {
        id: true,
        user_id: true,
        foto_profile: true,
        nik: true,
        nama: true,
        email: true,
        no_telepon: true,
        alamat: true,
        tanggal_bergabung: true,
        status: true,
      },
    });

    return withCors(
      NextResponse.json(
        karyawan.map((k) => ({
          id: k.id,
          user_id: k.user_id,
          foto_profile: k.foto_profile,
          nik: k.nik,
          nama: k.nama,
          email: k.email,
          no_telepon: k.no_telepon,
          alamat: k.alamat,
          tanggal_bergabung: k.tanggal_bergabung.toISOString().split('T')[0],
          status: k.status,
        })),
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('❌ Error saat mengambil data karyawan:', error);
    return withCors(
      NextResponse.json({ error: (error as Error).message } as KaryawanResponse, { status: 500 })
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: User = await req.json();

    if (!body.id) {
      return withCors(
        NextResponse.json({ error: 'ID diperlukan' } as KaryawanResponse, { status: 400 })
      );
    }

    const { nik, nama, email, no_telepon, alamat, tanggal_bergabung, status, foto_profile } = body;

    if (!nik || !nama || !email || !no_telepon || !alamat || !tanggal_bergabung || !status) {
      return withCors(
        NextResponse.json({ error: 'Semua field wajib diisi' } as KaryawanResponse, { status: 400 })
      );
    }

    let fotoProfilePath: string | null = null;
    if (foto_profile && foto_profile.startsWith('data:image')) {
      const matches = foto_profile.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return withCors(
          NextResponse.json(
            { error: 'Format base64 gambar tidak valid' } as KaryawanResponse,
            { status: 400 }
          )
        );
      }

      const imageType = matches[1];
      const base64Data = matches[2];

      const allowedTypes = ['jpeg', 'png', 'gif', 'webp'];
      if (!allowedTypes.includes(imageType)) {
        return withCors(
          NextResponse.json(
            { error: 'Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)' } as KaryawanResponse,
            { status: 400 }
          )
        );
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const maxSize = 2 * 1024 * 1024;
      if (buffer.length > maxSize) {
        return withCors(
          NextResponse.json(
            { error: 'Ukuran file terlalu besar. Maksimal 2MB' } as KaryawanResponse,
            { status: 400 }
          )
        );
      }

      const timestamp = Date.now();
      const filename = `profile_${timestamp}.${imageType}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
      const filePath = path.join(uploadDir, filename);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(filePath, buffer);

      fotoProfilePath = `/uploads/profiles/${filename}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingKaryawan = await tx.karyawan.findUnique({
        where: { id: body.id },
        select: { id: true, foto_profile: true },
      });

      if (!existingKaryawan) {
        throw new Error('Karyawan tidak ditemukan');
      }

      if (fotoProfilePath && existingKaryawan.foto_profile) {
        const oldFilePath = path.join(process.cwd(), 'public', existingKaryawan.foto_profile);
        try {
          await fs.unlink(oldFilePath);
        } catch (err) {
          console.warn('Failed to delete old profile photo:', err);
        }
      }

      const updatedKaryawan = await tx.karyawan.update({
        where: { id: body.id },
        data: {
          nik,
          nama,
          email,
          no_telepon,
          alamat,
          tanggal_bergabung: new Date(tanggal_bergabung),
          status,
          foto_profile: fotoProfilePath || existingKaryawan.foto_profile,
        },
        select: {
          id: true,
          nik: true,
          nama: true,
          email: true,
          no_telepon: true,
          alamat: true,
          tanggal_bergabung: true,
          status: true,
          foto_profile: true, // Added to fix TS2339
        },
      });

      return updatedKaryawan;
    });

    return withCors(
      NextResponse.json(
        {
          message: 'Data karyawan berhasil diperbarui',
          foto_profile: fotoProfilePath || result.foto_profile,
          updated_data: {
            id: result.id,
            nik: result.nik,
            nama: result.nama,
            email: result.email,
            no_telepon: result.no_telepon,
            alamat: result.alamat,
            tanggal_bergabung: result.tanggal_bergabung.toISOString().split('T')[0],
            status: result.status,
          },
        } as KaryawanResponse,
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('❌ Error saat memperbarui data:', error);
    return withCors(
      NextResponse.json(
        {
          error: (error as Error).message,
          details: error instanceof Error ? error.stack : null,
        } as KaryawanResponse,
        { status: 500 }
      )
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body: { id: number } = await req.json();

    if (!body.id) {
      return withCors(
        NextResponse.json({ error: 'ID diperlukan' } as KaryawanResponse, { status: 400 })
      );
    }

    const result = await prisma.karyawan.delete({
      where: { id: body.id },
      select: { foto_profile: true },
    });

    if (!result) {
      return withCors(
        NextResponse.json({ error: 'Karyawan tidak ditemukan' } as KaryawanResponse, { status: 404 })
      );
    }

    if (result.foto_profile) {
      const filePath = path.join(process.cwd(), 'public', result.foto_profile);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('Failed to delete profile photo:', err);
      }
    }

    return withCors(
      NextResponse.json({ message: 'Data berhasil dihapus' } as KaryawanResponse, { status: 200 })
    );
  } catch (error) {
    console.error('❌ Error saat menghapus data:', error);
    return withCors(
      NextResponse.json({ error: (error as Error).message } as KaryawanResponse, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}