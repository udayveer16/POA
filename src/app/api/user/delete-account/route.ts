import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('kyc_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { otpCode, identifier, identifierType } = await request.json();

    if (!otpCode || !identifier || !identifierType) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    // Verify session and get user
    const sessionResult = await pool.query(
      `SELECT k.user_id, k.email, k.phone
       FROM user_sessions s
       JOIN kyc_submissions k ON s.user_id = k.user_id
       WHERE s.session_token = $1 AND s.expires_at > NOW() AND k.deleted_at IS NULL
       LIMIT 1`,
      [sessionToken]
    );

    if (!sessionResult.rowCount || sessionResult.rowCount === 0) {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
    }

    const user = sessionResult.rows[0];

    // Verify the identifier belongs to this user
    const expectedValue = identifierType === 'email' ? user.email : user.phone;
    if (identifier !== expectedValue) {
      return NextResponse.json({ error: 'Identifier does not match your account.' }, { status: 403 });
    }

    // Verify OTP
    const otpResult = await pool.query(
      `SELECT id, code, expires_at FROM otp_codes
       WHERE identifier = $1 AND identifier_type = $2 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [identifier, identifierType]
    );

    if (!otpResult.rowCount || otpResult.rowCount === 0) {
      return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
    }

    const otpRecord = otpResult.rows[0];

    if (new Date() > new Date(otpRecord.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (otpRecord.code !== hashOtp(otpCode)) {
      return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 });
    }

    // Mark OTP used
    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpRecord.id]);

    // Permanently delete all user data (cascade handles tokens/sessions)
    await pool.query('DELETE FROM attendance_tokens WHERE user_id = $1', [user.user_id]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [user.user_id]);
    await pool.query('DELETE FROM otp_codes WHERE identifier = $1 OR identifier = $2', [user.email, user.phone]);
    await pool.query('DELETE FROM kyc_submissions WHERE user_id = $1', [user.user_id]);

    console.log(`[DATA DELETION] User ${user.user_id} permanently deleted at ${new Date().toISOString()}`);

    const response = NextResponse.json({ success: true, message: 'Your account and all data have been permanently deleted.' });
    response.cookies.set('kyc_session', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Deletion failed. Please try again.' }, { status: 500 });
  }
}