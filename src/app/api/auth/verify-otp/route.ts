import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, type, code } = await request.json();

    if (!identifier || !type || !code) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    // Find valid OTP record
    const otpResult = await pool.query(
      `SELECT id, code, expires_at FROM otp_codes
       WHERE identifier = $1 AND identifier_type = $2 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [identifier, type]
    );

    if (!otpResult.rowCount || otpResult.rowCount === 0) {
      return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
    }

    const otpRecord = otpResult.rows[0];

    if (new Date() > new Date(otpRecord.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Compare hashed OTP
    const hashedInput = hashOtp(code);
    if (otpRecord.code !== hashedInput) {
      return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 });
    }

    // Mark OTP as used
    await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = $1', [otpRecord.id]);

    // Get user — exclude deleted accounts
    const field = type === 'email' ? 'email' : 'phone';
    const userResult = await pool.query(
      `SELECT user_id, full_name, email, phone FROM kyc_submissions
       WHERE ${field} = $1 AND deleted_at IS NULL LIMIT 1`,
      [identifier]
    );

    if (!userResult.rowCount || userResult.rowCount === 0) {
      return NextResponse.json({ error: 'Account not found or has been deleted.' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Update last_login_at for retention tracking
    await pool.query(
      'UPDATE kyc_submissions SET last_login_at = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    // Create session token
    const sessionToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO user_sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionToken, user.user_id, expiresAt]
    );

    const response = NextResponse.json({
      success: true,
      user: { fullName: user.full_name, email: user.email, phone: user.phone },
    });

    response.cookies.set('kyc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}