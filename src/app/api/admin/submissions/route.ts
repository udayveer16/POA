import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, user_id, full_name, email, phone,
              consent_given_at, policy_version, created_at, last_login_at
       FROM kyc_submissions
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    return NextResponse.json({ submissions: result.rows });
  } catch (error) {
    console.error('Admin fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}