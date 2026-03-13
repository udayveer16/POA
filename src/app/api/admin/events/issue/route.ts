import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST: issue tokens
// body: { eventId, mode: 'all' | 'select' | 'manual', userIds?: string[], identifiers?: string[] }
export async function POST(request: NextRequest) {
  try {
    const { eventId, mode, userIds, identifiers } = await request.json();

    if (!eventId || !mode) {
      return NextResponse.json({ error: 'Missing eventId or mode.' }, { status: 400 });
    }

    // Verify event exists
    const eventCheck = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (!eventCheck.rowCount || eventCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    let targetUserIds: string[] = [];

    if (mode === 'all') {
      const res = await pool.query('SELECT user_id FROM kyc_submissions');
      targetUserIds = res.rows.map(r => r.user_id);

    } else if (mode === 'select') {
      if (!userIds || userIds.length === 0) {
        return NextResponse.json({ error: 'No users selected.' }, { status: 400 });
      }
      targetUserIds = userIds;

    } else if (mode === 'manual') {
      if (!identifiers || identifiers.length === 0) {
        return NextResponse.json({ error: 'No identifiers provided.' }, { status: 400 });
      }
      // Look up users by email or phone
      const res = await pool.query(
        `SELECT user_id FROM kyc_submissions
         WHERE email = ANY($1) OR phone = ANY($1)`,
        [identifiers]
      );
      targetUserIds = res.rows.map(r => r.user_id);
      if (targetUserIds.length === 0) {
        return NextResponse.json({ error: 'No matching users found for the provided emails/phones.' }, { status: 404 });
      }

    } else {
      return NextResponse.json({ error: 'Invalid mode.' }, { status: 400 });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'No users to issue tokens to.' }, { status: 400 });
    }

    // Bulk insert — ON CONFLICT DO NOTHING enforces one token per user per event
    let issued = 0;
    let skipped = 0;

    for (const userId of targetUserIds) {
      const res = await pool.query(
        `INSERT INTO attendance_tokens (event_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [eventId, userId]
      );
      if (res.rowCount && res.rowCount > 0) issued++;
      else skipped++;
    }

    return NextResponse.json({
      success: true,
      issued,
      skipped,
      message: `${issued} token(s) issued. ${skipped > 0 ? `${skipped} already had this token.` : ''}`,
    });
  } catch (error) {
    console.error('Issue token error:', error);
    return NextResponse.json({ error: 'Failed to issue tokens.' }, { status: 500 });
  }
}

// GET: get all users for select mode (with token status for an event)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  try {
    const result = await pool.query(`
      SELECT k.user_id, k.full_name, k.email, k.phone,
        CASE WHEN at.user_id IS NOT NULL THEN true ELSE false END AS already_issued
      FROM kyc_submissions k
      LEFT JOIN attendance_tokens at
        ON at.user_id = k.user_id AND at.event_id = $1
      ORDER BY k.full_name ASC
    `, [eventId || null]);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }
}