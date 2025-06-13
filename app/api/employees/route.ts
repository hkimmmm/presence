import bcrypt from 'bcryptjs';
import pool from '@/app/utils/db';
import { NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// CORS Configuration
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface User {
    id?: number;
    user_id: number;
    foto_profile: string;
    nik: string;
    nama: string;
    email: string;
    password: string;
    no_telepon: string;
    alamat: string;
    tanggal_bergabung: string;
    status: 'aktif' | 'nonaktif';
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
        // Mengubah dari JSON ke FormData
        const formData = await req.formData();
        
        // Ekstrak data dari FormData
        const file = formData.get('foto_profile') as File | null;
        const nik = formData.get('nik') as string;
        const nama = formData.get('nama') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const no_telepon = formData.get('no_telepon') as string;
        const alamat = formData.get('alamat') as string;
        const tanggal_bergabung = formData.get('tanggal_bergabung') as string;
        const status = formData.get('status') as 'aktif' | 'nonaktif';

        // Validasi file
        let fotoProfilePath = '';
        if (file) {
            // Validasi tipe file
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)');
            }

            // Validasi ukuran file (max 2MB)
            const maxSize = 2 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('Ukuran file terlalu besar. Maksimal 2MB');
            }

            // Membuat nama file unik
            const timestamp = Date.now();
            const ext = path.extname(file.name);
            const filename = `profile_${timestamp}${ext}`;

            // Path tujuan penyimpanan
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
            const filePath = path.join(uploadDir, filename);

            // Membuat direktori jika belum ada
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Menyimpan file
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.promises.writeFile(filePath, buffer);

            fotoProfilePath = `/uploads/profiles/${filename}`;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // INSERT ke tabel users
        const userQuery = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
        const [userResult] = await connection.query<ResultSetHeader>(
            userQuery,
            [
                nama.toLowerCase().replace(/\s/g, ''), // username
                email,                                // email
                hashedPassword,                       // password
                'karyawan'                            // role (ditambahkan)
            ]
        );

        const newUserId = userResult.insertId;
        console.log("✅ User berhasil ditambahkan dengan ID:", newUserId);

        // INSERT ke tabel karyawan
        const karyawanQuery = `INSERT INTO karyawan (user_id, foto_profile, nik, nama, email, no_telepon, alamat, tanggal_bergabung, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [karyawanResult] = await connection.query<ResultSetHeader>(karyawanQuery, [
            newUserId, fotoProfilePath, nik, nama, email, no_telepon, alamat, tanggal_bergabung, status
        ]);

        console.log("✅ karyawan berhasil ditambahkan dengan ID:", karyawanResult.insertId);

        await connection.commit();
        connection.release();

        return withCors(NextResponse.json({ 
            message: 'karyawan dan User berhasil ditambahkan', 
            user_id: newUserId,
            foto_profile: fotoProfilePath 
        }, { status: 201 }));

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("❌ Error saat menambahkan data:", error);
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function GET() {
    try {
        const query = `SELECT * FROM karyawan`;
        const [rows] = await pool.query<RowDataPacket[]>(query);
        
        return withCors(NextResponse.json(rows, { status: 200 }));
    } catch (error) {
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function PUT(req: Request) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        // Parse JSON body
        const body: User = await req.json();
        
        if (!body.id) {
            return withCors(NextResponse.json({ error: 'ID diperlukan' }, { status: 400 }));
        }

        // Cari data karyawan yang ada untuk mendapatkan path foto lama
        const [existingData] = await connection.query<RowDataPacket[]>(
            'SELECT foto_profile FROM karyawan WHERE id = ?',
            [body.id]
        );

        if (existingData.length === 0) {
            return withCors(NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 }));
        }

        const existingFotoProfile = existingData[0].foto_profile;
        let fotoProfilePath = existingFotoProfile;

        // Jika ada file baru yang diupload (dikirim sebagai base64 string)
        if (body.foto_profile && body.foto_profile.startsWith('data:image')) {
            // Ekstrak tipe file dan data base64
            const matches = body.foto_profile.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error('Format base64 gambar tidak valid');
            }

            const imageType = matches[1];
            const base64Data = matches[2];
            
            // Validasi tipe file
            const allowedTypes = ['jpeg', 'png', 'gif', 'webp'];
            if (!allowedTypes.includes(imageType)) {
                throw new Error('Format file tidak didukung. Harap unggah gambar (JPEG, PNG, GIF, atau WebP)');
            }

            // Validasi ukuran file (max 2MB)
            const buffer = Buffer.from(base64Data, 'base64');
            const maxSize = 2 * 1024 * 1024;
            if (buffer.length > maxSize) {
                throw new Error('Ukuran file terlalu besar. Maksimal 2MB');
            }

            // Membuat nama file unik
            const timestamp = Date.now();
            const filename = `profile_${timestamp}.${imageType}`;

            // Path tujuan penyimpanan
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
            const filePath = path.join(uploadDir, filename);

            // Membuat direktori jika belum ada
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Menyimpan file baru
            await fs.promises.writeFile(filePath, buffer);

            fotoProfilePath = `/uploads/profiles/${filename}`;

            // Hapus file lama jika ada
            if (existingFotoProfile) {
                const oldFilePath = path.join(process.cwd(), 'public', existingFotoProfile);
                if (fs.existsSync(oldFilePath)) {
                    await fs.promises.unlink(oldFilePath);
                }
            }
        }

        // Update data karyawan
        const query = `UPDATE karyawan SET foto_profile = ?, nik = ?, nama = ?, email = ?, no_telepon = ?, alamat = ?, tanggal_bergabung = ?, status = ? WHERE id = ?`;
        await connection.query<ResultSetHeader>(query, [
            fotoProfilePath, 
            body.nik, 
            body.nama, 
            body.email, 
            body.no_telepon, 
            body.alamat, 
            body.tanggal_bergabung, 
            body.status, 
            body.id
        ]);

        await connection.commit();
        connection.release();

        return withCors(NextResponse.json({ 
            message: 'Data karyawan berhasil diperbarui',
            foto_profile: fotoProfilePath,
            updated_data: {
                id: body.id,
                nik: body.nik,
                nama: body.nama,
                email: body.email,
                no_telepon: body.no_telepon,
                alamat: body.alamat,
                tanggal_bergabung: body.tanggal_bergabung,
                status: body.status
            }
        }, { status: 200 }));

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error("❌ Error saat memperbarui data:", error);
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
            return withCors(NextResponse.json({ error: "ID diperlukan" }, { status: 400 }));
        }

        // Hapus data karyawan berdasarkan ID
        const query = `DELETE FROM karyawan WHERE id = ?`;
        const [result]: [ResultSetHeader, FieldPacket[]] = await pool.query(query, [body.id]);

        // Jika tidak ada baris yang terhapus, berarti ID tidak ditemukan
        if (result.affectedRows === 0) {
            return withCors(NextResponse.json({ error: "karyawan tidak ditemukan" }, { status: 404 }));
        }

        return withCors(NextResponse.json({ message: "Data berhasil dihapus" }, { status: 200 }));
    } catch (error) {
        return withCors(NextResponse.json({ error: (error as Error).message }, { status: 500 }));
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}