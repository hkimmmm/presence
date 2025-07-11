import { NextResponse } from 'next/server';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'https://31.97.108.186',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    'Access-Control-Max-Age': '86400',
  };
}

export async function POST() {
  try {
    const response = new NextResponse(
      JSON.stringify({ message: 'Logout berhasil' }),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );

    // Hapus token dari cookie
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Segera kedaluwarsa
    });

    return response;
  } catch (error) {
    console.error('Error saat logout:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Terjadi kesalahan pada server' }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}