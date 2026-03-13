import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('kyc_session')?.value;
    if (!sessionToken) return NextResponse.json({ user: null }, { status: 401 });

    const result = await pool.query(
      `SELECT k.user_id, k.full_name, k.email, k.phone,
              k.created_at, k.consent_given_at, k.policy_version, k.last_login_at
       FROM user_sessions s
       JOIN kyc_submissions k ON s.user_id = k.user_id
       WHERE s.session_token = $1 AND s.expires_at > NOW() AND k.deleted_at IS NULL
       LIMIT 1`,
      [sessionToken]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const u = result.rows[0];
    return NextResponse.json({
      user: {
        userId: u.user_id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        createdAt: u.created_at,
        consentGivenAt: u.consent_given_at,
        policyVersion: u.policy_version,
        lastLoginAt: u.last_login_at,
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}