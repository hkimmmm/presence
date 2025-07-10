/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/utils/prisma';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'sales' | 'supervisor' | 'karyawan';
}

// 🚀 POST: Create user
export async function POST(req: Request) {
  try {
    const body: User = await req.json();

    if (!body.username || !body.email || !body.password || !body.role) {
      throw new Error('Username, email, password, and role are required');
    }

    const validRoles = ['admin', 'sales', 'supervisor', 'karyawan'];
    if (!validRoles.includes(body.role)) {
      throw new Error('Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    const existing = await prisma.users.findFirst({
      where: {
        OR: [
          { username: body.username },
          { email: body.email }
        ]
      }
    });

    if (existing) {
      throw new Error('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const newUser = await prisma.users.create({
      data: {
        username: body.username,
        email: body.email,
        password: hashedPassword,
        role: body.role
      }
    });

    return withCors(NextResponse.json({ 
      message: 'User successfully added', 
      user_id: newUser.id 
    }, { status: 201 }));

  } catch (error) {
    console.error("❌ Error adding user:", error);
    return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
  }
}

// 🚀 GET: List users
export async function GET() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    return withCors(NextResponse.json(users, { status: 200 }));
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
  }
}

// 🚀 PUT: Update user
export async function PUT(req: Request) {
  try {
    const body: User = await req.json();

    if (!body.id) throw new Error('ID is required');
    if (!body.username || !body.email || !body.role) {
      throw new Error('Username, email, and role are required');
    }

    const validRoles = ['admin', 'sales', 'supervisor', 'karyawan'];
    if (!validRoles.includes(body.role)) {
      throw new Error('Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    const user = await prisma.users.findUnique({ where: { id: body.id } });
    if (!user) throw new Error('User not found');

    const duplicate = await prisma.users.findFirst({
      where: {
        AND: [
          {
            OR: [
              { username: body.username },
              { email: body.email }
            ]
          },
          { id: { not: body.id } }
        ]
      }
    });
    if (duplicate) {
      throw new Error('Username or email already exists');
    }

    const updateData: any = {
      username: body.username,
      email: body.email,
      role: body.role
    };

    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    await prisma.users.update({
      where: { id: body.id },
      data: updateData
    });

    return withCors(NextResponse.json({ 
      message: 'User successfully updated',
      updated_data: { id: body.id, username: body.username, email: body.email, role: body.role }
    }, { status: 200 }));

  } catch (error) {
    console.error("❌ Error updating user:", error);
    return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
  }
}

// 🚀 DELETE: Delete user
export async function DELETE(req: Request) {
  try {
    const body: { id: number } = await req.json();
    if (!body.id) {
      return withCors(NextResponse.json({ error: "ID is required" }, { status: 400 }));
    }

    const user = await prisma.users.findUnique({ where: { id: body.id } });
    if (!user) {
      return withCors(NextResponse.json({ error: "User not found" }, { status: 404 }));
    }

    await prisma.users.delete({ where: { id: body.id } });

    return withCors(NextResponse.json({ message: "User successfully deleted" }, { status: 200 }));
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
  }
}

// 🚀 OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}
