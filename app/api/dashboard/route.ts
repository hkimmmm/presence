import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';


type JwtPayload = {
  nama?: string;
  email?: string;
  username?: string;
  role?: string;
  foto_profile?: string;
  [key: string]: unknown;
};

function verifyToken(request: Request): JwtPayload | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret);
    if (typeof payload === 'string') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = verifyToken(request);

  if (!user) {
    return new NextResponse(
      JSON.stringify({ message: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new NextResponse(
    JSON.stringify({
      nama: user.nama || user.username || null,
      email: user.email || user.email || null,
      role: user.role || null,
      foto_profile: user.foto_profile || null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}


function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Content-Type': 'application/json',
  };
}

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders(),
  });
}
