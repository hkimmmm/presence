import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface LokasiKantor {
  id?: number;
  nama_kantor: string;
  latitude: string | number;
  longitude: string | number;
  radius_meter: number;
  created_at?: Date;
  updated_at?: Date;
}

interface LokasiKantorResponse {
  message?: string;
  updated_data?: {
    id: number;
    nama_kantor: string;
    latitude: number;
    longitude: number;
    radius_meter: number;
  };
  error?: string;
  details?: string | null;
}

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function GET() {
  try {
    const lokasiKantor = await prisma.lokasi_kantor.findMany({
      select: {
        id: true,
        nama_kantor: true,
        latitude: true,
        longitude: true,
        radius_meter: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Konversi BigInt (id) ke number dan Decimal (latitude, longitude) ke number
    const formattedLokasiKantor = lokasiKantor.map((lokasi) => ({
      id: Number(lokasi.id),
      nama_kantor: lokasi.nama_kantor,
      latitude: Number(lokasi.latitude),
      longitude: Number(lokasi.longitude),
      radius_meter: lokasi.radius_meter,
      created_at: lokasi.created_at,
      updated_at: lokasi.updated_at,
    }));

    return withCors(NextResponse.json(formattedLokasiKantor, { status: 200 }));
  } catch (error) {
    console.error('❌ Error saat mengambil data lokasi kantor:', error);
    return withCors(
      NextResponse.json(
        { error: (error as Error).message } as LokasiKantorResponse,
        { status: 500 }
      )
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: LokasiKantor = await req.json();

    if (!body.id) {
      return withCors(
        NextResponse.json(
          { error: 'ID diperlukan' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }

    const { nama_kantor, latitude, longitude, radius_meter } = body;

    if (!nama_kantor || latitude === undefined || longitude === undefined || radius_meter === undefined) {
      return withCors(
        NextResponse.json(
          { error: 'Semua field wajib diisi' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }

    if (typeof nama_kantor !== 'string' || nama_kantor.length > 100) {
      return withCors(
        NextResponse.json(
          { error: 'Nama kantor harus berupa string dengan maksimal 100 karakter' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }

    const lat = typeof latitude === 'string' ? parseFloat(parseFloat(latitude).toFixed(12)) : Number(latitude.toFixed(12));
    const lon = typeof longitude === 'string' ? parseFloat(parseFloat(longitude).toFixed(12)) : Number(longitude.toFixed(12));
    const rad = typeof radius_meter === 'string' ? parseInt(radius_meter, 10) : radius_meter;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return withCors(
        NextResponse.json(
          { error: 'Latitude harus antara -90 dan 90' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return withCors(
        NextResponse.json(
          { error: 'Longitude harus antara -180 dan 180' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }
    if (isNaN(rad) || rad <= 0 || !Number.isInteger(rad)) {
      return withCors(
        NextResponse.json(
          { error: 'Radius harus berupa angka bulat positif' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingData = await tx.lokasi_kantor.findUnique({
        where: { id: body.id },
        select: { id: true },
      });

      if (!existingData) {
        throw new Error('Lokasi kantor tidak ditemukan');
      }

      const updatedData = await tx.lokasi_kantor.update({
        where: { id: body.id },
        data: {
          nama_kantor,
          latitude: lat,
          longitude: lon,
          radius_meter: rad,
          updated_at: new Date(),
        },
        select: {
          id: true,
          nama_kantor: true,
          latitude: true,
          longitude: true,
          radius_meter: true,
        },
      });

      return updatedData;
    });

    return withCors(
      NextResponse.json(
        {
          message: 'Lokasi kantor berhasil diperbarui',
          updated_data: {
            id: Number(result.id),
            nama_kantor: result.nama_kantor,
            latitude: Number(result.latitude),
            longitude: Number(result.longitude),
            radius_meter: result.radius_meter,
          },
        } as LokasiKantorResponse,
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('❌ Error saat memperbarui lokasi kantor:', error);
    return withCors(
      NextResponse.json(
        {
          error: (error as Error).message,
          details: error instanceof Error ? error.stack : null,
        } as LokasiKantorResponse,
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
        NextResponse.json(
          { error: 'ID diperlukan' } as LokasiKantorResponse,
          { status: 400 }
        )
      );
    }

    const result = await prisma.lokasi_kantor.delete({
      where: { id: body.id },
    });

    if (!result) {
      return withCors(
        NextResponse.json(
          { error: 'Lokasi kantor tidak ditemukan' } as LokasiKantorResponse,
          { status: 404 }
        )
      );
    }

    return withCors(
      NextResponse.json(
        { message: 'Lokasi kantor berhasil dihapus' } as LokasiKantorResponse,
        { status: 200 }
      )
    );
  } catch (error) {
    console.error('❌ Error saat menghapus lokasi kantor:', error);
    return withCors(
      NextResponse.json(
        { error: (error as Error).message } as LokasiKantorResponse,
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}