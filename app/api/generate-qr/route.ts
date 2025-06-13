import { NextRequest, NextResponse } from 'next/server';

type QRType = 'checkin' | 'checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type: QRType = body.type;
    const presensiId = body.presensiId;

    // Validasi input
    if (type !== 'checkin' && type !== 'checkout') {
      return NextResponse.json({ message: 'Jenis QR tidak valid' }, { status: 400 });
    }

    if (!presensiId || isNaN(Number(presensiId))) {
      return NextResponse.json({ message: 'presensiId wajib diisi dan berupa angka' }, { status: 400 });
    }

    const payload = {
  token: Number(presensiId),
  type,
};

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');

    return NextResponse.json({
      qrCode: encoded,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), 
    });
  } catch (err) {
    console.error('QR Code error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan saat generate QR' }, { status: 500 });
  }
}
