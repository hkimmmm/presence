// app/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  user_id: number;
  username: string;
  role: 'admin' | 'supervisor';
}

const JWT_SECRET: string = process.env.JWT_SECRET ?? '';
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_token', request.url)
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/dashboard') && decoded.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/auth/login?error=admin_access_required', request.url)
      );
    }

    if (pathname.startsWith('/supervisor') && decoded.role !== 'supervisor') {
      return NextResponse.redirect(
        new URL('/auth/login?error=supervisor_access_required', request.url)
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_token', request.url)
    );
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/supervisor/:path*'],
};