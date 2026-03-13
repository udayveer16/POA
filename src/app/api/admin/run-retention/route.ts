import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ADMIN_KEY = process.env.ADMIN_RETENTION_KEY || 'retention-secret-change-me';
const RETENTION_YEARS = 2;

export async function POST(request: NextRequest) {
  try {
    // Simple secret key auth for this endpoint
    const { key } = await request.json();
    if (key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

    // Find users inactive for more than 2 years
    // Uses last_login_at; falls back to created_at if never logged in
    const toDelete = await pool.query(
      `SELECT user_id, email, full_name,
        COALESCE(last_login_at, created_at) AS last_active
       FROM kyc_submissions
       WHERE deleted_at IS NULL
         AND COALESCE(last_login_at, created_at) < $1`,
      [cutoffDate]
    );

    const count = toDelete.rowCount ?? 0;

    if (count === 0) {
      return NextResponse.json({ success: true, deleted: 0, message: 'No records past retention period.' });
    }

    const userIds = toDelete.rows.map(r => r.user_id);
    const emails = toDelete.rows.map(r => r.email);

    // Delete in order to respect FK constraints
    await pool.query('DELETE FROM attendance_tokens WHERE user_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1)', [userIds]);
    await pool.query('DELETE FROM otp_codes WHERE identifier = ANY($1)', [emails]);
    await pool.query('DELETE FROM kyc_submissions WHERE user_id = ANY($1)', [userIds]);

    console.log(`[RETENTION] Deleted ${count} user(s) inactive since before ${cutoffDate.toISOString()}`);
    toDelete.rows.forEach(r =>
      console.log(`  - ${r.full_name} (${r.email}), last active: ${r.last_active}`)
    );

    return NextResponse.json({
      success: true,
      deleted: count,
      message: `${count} record(s) permanently deleted (inactive > ${RETENTION_YEARS} years).`,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error('Retention run error:', error);
    return NextResponse.json({ error: 'Retention run failed.' }, { status: 500 });
  }
}