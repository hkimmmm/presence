import { NextResponse } from 'next/server';
import pool from '@/app/utils/db';// pastikan path sesuai

export async function GET() {
  try {
    const [rows] = await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    console.error("❌ DB ERROR:", err);
    return NextResponse.json({ ok: false, error: err }, { status: 500 });
  }
}
