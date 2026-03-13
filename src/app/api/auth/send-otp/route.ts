import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, type } = await request.json();

    if (!identifier || !type || !['email', 'phone'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    // Check user exists and is not deleted
    const field = type === 'email' ? 'email' : 'phone';
    const userResult = await pool.query(
      `SELECT user_id, full_name FROM kyc_submissions
       WHERE ${field} = $1 AND deleted_at IS NULL LIMIT 1`,
      [identifier]
    );

    if (!userResult.rowCount || userResult.rowCount === 0) {
      return NextResponse.json(
        { error: `No account found with this ${type}. Please register first.` },
        { status: 404 }
      );
    }

    const otp = generateOTP();
    const hashedOtp = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate existing unused OTPs
    await pool.query(
      'UPDATE otp_codes SET used = TRUE WHERE identifier = $1 AND used = FALSE',
      [identifier]
    );

    // Store hashed OTP
    await pool.query(
      'INSERT INTO otp_codes (identifier, identifier_type, code, expires_at) VALUES ($1, $2, $3, $4)',
      [identifier, type, hashedOtp, expiresAt]
    );

    // SIMULATED: log to console — replace with real email/SMS in production
    console.log(`\n====================================`);
    console.log(`  OTP for ${type}: ${identifier}`);
    console.log(`  Code: ${otp}`);
    console.log(`  Expires: ${expiresAt.toLocaleTimeString()}`);
    console.log(`====================================\n`);

    return NextResponse.json({
      success: true,
      message: `OTP sent to your ${type}.`,
      _dev_otp: otp, // Remove this in production
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}