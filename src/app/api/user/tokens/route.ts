import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('kyc_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from session
    const sessionResult = await pool.query(
      `SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    if (!sessionResult.rowCount || sessionResult.rowCount === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionResult.rows[0].user_id;

    const result = await pool.query(`
      SELECT
        at.id AS token_id,
        at.issued_at,
        e.id AS event_id,
        e.name,
        e.event_date,
        e.location,
        e.description,
        e.speaker,
        e.category,
        e.image_path
      FROM attendance_tokens at
      JOIN events e ON at.event_id = e.id
      WHERE at.user_id = $1
      ORDER BY at.issued_at DESC
    `, [userId]);

    return NextResponse.json({ tokens: result.rows });
  } catch (error) {
    console.error('User tokens error:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens.' }, { status: 500 });
  }
}