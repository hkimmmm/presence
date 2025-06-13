import { NextResponse } from 'next/server';
import { ResultSetHeader, RowDataPacket, FieldPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import pool from '@/app/utils/db';

export async function POST(request: Request) {
    try {
        const { username, email, password, role, nik, nama, no_telepon, alamat } = await request.json();

        if (!username || !email || !password || !role) {
            return NextResponse.json({ message: 'Semua data wajib diisi' }, { status: 400 });
        }

        // Cek apakah email sudah digunakan
        const [existingUsers]: [RowDataPacket[], FieldPacket[]] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert ke tabel users
        const [result]: [ResultSetHeader, FieldPacket[]] = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role]
        );

        const userId = result.insertId;

        // Jika role adalah karyawan, tambahkan ke tabel karyawan
        if (role === 'karyawan') {
            if (!nik || !nama || !no_telepon || !alamat) {
                return NextResponse.json({ message: 'Data karyawan wajib diisi' }, { status: 400 });
            }

            // Cek apakah NIK sudah terdaftar
            const [existingKaryawan]: [RowDataPacket[], FieldPacket[]] = await pool.query(
                'SELECT id FROM karyawan WHERE nik = ?',
                [nik]
            );

            if (existingKaryawan.length > 0) {
                return NextResponse.json({ message: 'NIK sudah terdaftar' }, { status: 400 });
            }

            await pool.query(
                `INSERT INTO karyawan (user_id, nik, nama, email, no_telepon, alamat, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, nik, nama, email, no_telepon, alamat, 'aktif']
            );
        }

        return NextResponse.json({ message: 'User berhasil didaftarkan', userId });
    } catch (error) {
        console.error('Error Register:', error);
        return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
