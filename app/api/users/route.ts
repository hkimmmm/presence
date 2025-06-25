import bcrypt from 'bcryptjs';
import pool from '@/app/utils/db';
import { NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// CORS Configuration
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface User {
    id?: number;
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'sales' | 'supervisor' | 'karyawan';
}

// Helper function to add CORS headers to responses
function withCors(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}

export async function POST(req: Request) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const body: User = await req.json();
        
        // Validate required fields
        if (!body.username || !body.email || !body.password || !body.role) {
            throw new Error('Username, email, password, and role are required');
        }

        // Validate role
        const validRoles = ['admin', 'sales', 'supervisor', 'karyawan'];
        if (!validRoles.includes(body.role)) {
            throw new Error('Invalid role. Must be one of: ' + validRoles.join(', '));
        }

        // Check if username or email already exists
        const [existingUser] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [body.username, body.email]
        );
        if (existingUser.length > 0) {
            throw new Error('Username or email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(body.password, 10);

        // Insert into users table
        const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
        const [result] = await connection.query<ResultSetHeader>(query, [
            body.username,
            body.email,
            hashedPassword,
            body.role
        ]);

        const newUserId = result.insertId;
        console.log("✅ User successfully added with ID:", newUserId);

        await connection.commit();
        connection.release();

        return withCors(NextResponse.json({ 
            message: 'User successfully added', 
            user_id: newUserId 
        }, { status: 201 }));

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("❌ Error adding user:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function GET() {
    try {
        const query = `SELECT id, username, email, role FROM users`;
        const [rows] = await pool.query<RowDataPacket[]>(query);
        
        return withCors(NextResponse.json(rows, { status: 200 }));
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function PUT(req: Request) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const body: User = await req.json();
        
        if (!body.id) {
            throw new Error('ID is required');
        }

        // Validate required fields
        if (!body.username || !body.email || !body.role) {
            throw new Error('Username, email, and role are required');
        }

        // Validate role
        const validRoles = ['admin', 'sales', 'supervisor', 'karyawan'];
        if (!validRoles.includes(body.role)) {
            throw new Error('Invalid role. Must be one of: ' + validRoles.join(', '));
        }

        // Check if user exists
        const [existingUser] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE id = ?',
            [body.id]
        );
        if (existingUser.length === 0) {
            throw new Error('User not found');
        }

        // Check if username or email is already used by another user
        const [duplicateCheck] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [body.username, body.email, body.id]
        );
        if (duplicateCheck.length > 0) {
            throw new Error('Username or email already exists');
        }

        // Prepare update query
        let query = `UPDATE users SET username = ?, email = ?, role = ?`;
        const queryParams = [body.username, body.email, body.role];

        // If password is provided, hash and update it
        if (body.password) {
            const hashedPassword = await bcrypt.hash(body.password, 10);
            query += `, password = ?`;
            queryParams.push(hashedPassword);
        }

        query += ` WHERE id = ?`;
        queryParams.push(body.id.toString());

        // Update user
        await connection.query<ResultSetHeader>(query, queryParams);

        await connection.commit();
        connection.release();

        return withCors(NextResponse.json({ 
            message: 'User successfully updated',
            updated_data: {
                id: body.id,
                username: body.username,
                email: body.email,
                role: body.role
            }
        }, { status: 200 }));

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("❌ Error updating user:", error);
        return withCors(NextResponse.json({ 
            error: (error as Error).message,
            details: error instanceof Error ? error.stack : null
        }, { status: 500 }));
    }
}

export async function DELETE(req: Request) {
    try {
        const body: { id: number } = await req.json();
        if (!body.id) {
            return withCors(NextResponse.json({ error: "ID is required" }, { status: 400 }));
        }

        // Delete user by ID
        const query = `DELETE FROM users WHERE id = ?`;
        const [result] = await pool.query<ResultSetHeader>(query, [body.id]);

        if (result.affectedRows === 0) {
            return withCors(NextResponse.json({ error: "User not found" }, { status: 404 }));
        }

        return withCors(NextResponse.json({ message: "User successfully deleted" }, { status: 200 }));
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}