import { NextResponse } from 'next/server';
import pool from '@/app/utils/db';
import { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';

// CORS Configuration
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
    created_at?: string;
    updated_at?: string;
}

// Helper function to add CORS headers to responses
function withCors(response: NextResponse): NextResponse {
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}

export async function GET() {
    try {
        const query = `SELECT * FROM lokasi_kantor`;
        const [rows] = await pool.query<RowDataPacket[]>(query);
        
        return withCors(NextResponse.json(rows, { status: 200 }));
    } catch (error) {
        console.error("❌ Error saat mengambil data lokasi kantor:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function PUT(req: Request) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const body: LokasiKantor = await req.json();
        
        if (!body.id) {
            throw new Error('ID diperlukan');
        }

        const { nama_kantor, latitude, longitude, radius_meter } = body;

        // Validate required fields
        if (!nama_kantor || latitude === undefined || longitude === undefined || radius_meter === undefined) {
            throw new Error('Semua field wajib diisi');
        }

        // Validate data types and ranges
        if (typeof nama_kantor !== 'string' || nama_kantor.length > 100) {
            throw new Error('Nama kantor harus berupa string dengan maksimal 100 karakter');
        }

        // Convert latitude and longitude to numbers for validation
 // Convert dan bulatkan ke 12 desimal
const lat = typeof latitude === 'string' ? parseFloat(parseFloat(latitude).toFixed(12)) : Number(latitude.toFixed(12));
const lon = typeof longitude === 'string' ? parseFloat(parseFloat(longitude).toFixed(12)) : Number(longitude.toFixed(12));


        if (isNaN(lat) || lat < -90 || lat > 90) {
            throw new Error('Latitude harus antara -90 dan 90');
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
            throw new Error('Longitude harus antara -180 dan 180');
        }
        if (typeof radius_meter !== 'number' || radius_meter <= 0) {
            throw new Error('Radius harus berupa angka positif');
        }

        // Check if location exists
        const [existingData] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM lokasi_kantor WHERE id = ?',
            [body.id]
        );

        if (existingData.length === 0) {
            throw new Error('Lokasi kantor tidak ditemukan');
        }

        // Update lokasi_kantor
        const query = `UPDATE lokasi_kantor SET nama_kantor = ?, latitude = ?, longitude = ?, radius_meter = ?, updated_at = NOW() WHERE id = ?`;
        await connection.query<ResultSetHeader>(query, [
            nama_kantor,
            lat,
            lon,
            radius_meter,
            body.id
        ]);

        await connection.commit();
        connection.release();

        return withCors(NextResponse.json({ 
            message: 'Lokasi kantor berhasil diperbarui',
            updated_data: {
                id: body.id,
                nama_kantor,
                latitude: lat,
                longitude: lon,
                radius_meter
            }
        }, { status: 200 }));

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("❌ Error saat memperbarui lokasi kantor:", error);
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
            return withCors(NextResponse.json({ error: 'ID diperlukan' }, { status: 400 }));
        }

        // Delete from lokasi_kantor
        const query = `DELETE FROM lokasi_kantor WHERE id = ?`;
        const [result]: [ResultSetHeader, FieldPacket[]] = await pool.query(query, [body.id]);

        if (result.affectedRows === 0) {
            return withCors(NextResponse.json({ error: 'Lokasi kantor tidak ditemukan' }, { status: 404 }));
        }

        return withCors(NextResponse.json({ message: 'Lokasi kantor berhasil dihapus' }, { status: 200 }));
    } catch (error) {
        console.error("❌ Error saat menghapus lokasi kantor:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}