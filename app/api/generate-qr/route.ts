/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

type QRType = 'checkin' | 'checkout';

interface AuthUser {
  karyawan_id: number | null; // Allow null for admin
  role: string;
  user_id?: number; // Optional for created_by
}

interface QRRequest {
  type: QRType;
  presensiId?: number;
  karyawan_id?: number;
  is_mass_qr?: boolean;
}

interface QRResponse {
  message?: string;
  qrCode?: string;
  expiresAt?: string;
  batchId?: string;
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  return req.cookies.get('token')?.value || null;
}

async function authorize(req: NextRequest): Promise<{ user: AuthUser } | null> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { karyawan_id?: number; role?: string; user_id?: number };
    return {
      user: {
        karyawan_id: decoded.karyawan_id || null,
        role: decoded.role || 'karyawan',
        user_id: decoded.user_id,
      },
    };
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req);
    if (!auth) {
      return NextResponse.json({ message: 'Tidak diizinkan: Token tidak valid' } as QRResponse, { status: 401 });
    }

    const body: QRRequest = await req.json();
    const { type, presensiId, karyawan_id: targetKaryawanId, is_mass_qr } = body;

    console.log('Menerima request:', { type, presensiId, targetKaryawanId, is_mass_qr, user: auth.user });

    if (type !== 'checkin' && type !== 'checkout') {
      return NextResponse.json({ message: 'Jenis QR tidak valid' } as QRResponse, { status: 400 });
    }

    if (is_mass_qr) {
      if (auth.user.role !== 'admin') {
        return NextResponse.json({ message: 'Hanya admin yang dapat membuat QR massal' } as QRResponse, { status: 403 });
      }

      const today = new Date().toISOString().slice(0, 10);
      const batchId = `${today}-${uuidv4()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await prisma.$transaction(async (tx) => {
        await tx.qr_batches.create({
          data: {
            id: batchId,
            type,
            created_at: new Date(),
            expires_at: expiresAt,
            created_by: auth.user.user_id || null,
          },
        });
      });

      const payload = {
        type,
        batchId,
        expiresAt: expiresAt.toISOString(),
      };

      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

      return NextResponse.json({
        qrCode: encoded,
        expiresAt: payload.expiresAt,
        batchId,
      } as QRResponse);
    }

    if (!presensiId || isNaN(Number(presensiId))) {
      return NextResponse.json({ message: 'presensiId wajib diisi dan berupa angka' } as QRResponse, { status: 400 });
    }

    let whereClause: any = { id: presensiId };

    if (auth.user.role !== 'admin') {
      if (!auth.user.karyawan_id) {
        return NextResponse.json({ message: 'karyawan_id diperlukan untuk karyawan' } as QRResponse, { status: 400 });
      }
      whereClause = { id: presensiId, karyawan_id: auth.user.karyawan_id };
    } else if (targetKaryawanId) {
      whereClause = { id: presensiId, karyawan_id: targetKaryawanId };
    }

    const presensi = await prisma.presensi.findFirst({
      where: whereClause,
      select: {
        id: true,
        checkout_time: true,
        karyawan_id: true,
      },
    });

    console.log('Hasil query presensi:', presensi);

    if (!presensi) {
      return NextResponse.json({ message: 'Presensi tidak ditemukan atau tidak diizinkan' } as QRResponse, { status: 404 });
    }

    if (type === 'checkout' && presensi.checkout_time !== null) {
      return NextResponse.json({ message: 'Presensi ini sudah check-out' } as QRResponse, { status: 400 });
    }

    const payload = {
      token: presensi.id,
      type,
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    return NextResponse.json({
      qrCode: encoded,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    } as QRResponse);
  } catch (err) {
    console.error('QR Code error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan saat generate QR' } as QRResponse, { status: 500 });
  }
}