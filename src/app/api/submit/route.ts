import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';

const CURRENT_POLICY_VERSION = 'v1.0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, consentGiven } = body;

    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'You must accept the Privacy Policy and Terms of Service to register.' },
        { status: 400 }
      );
    }

    // Check for duplicate — exclude soft-deleted accounts
    const duplicate = await pool.query(
      `SELECT CASE WHEN email = $1 THEN 'email' ELSE 'phone' END AS field
       FROM kyc_submissions
       WHERE (email = $1 OR phone = $2) AND deleted_at IS NULL
       LIMIT 1`,
      [email, phone]
    );

    if (duplicate.rowCount && duplicate.rowCount > 0) {
      const field = duplicate.rows[0].field;
      return NextResponse.json(
        { error: `This ${field} has already been registered. Each ${field} can only be used once.` },
        { status: 409 }
      );
    }

    const userId = uuidv4();
    const consentTimestamp = new Date();

    const result = await pool.query(
      `INSERT INTO kyc_submissions
        (user_id, full_name, email, phone, consent_given_at, policy_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, created_at`,
      [userId, fullName, email, phone, consentTimestamp, CURRENT_POLICY_VERSION]
    );

    const record = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Registration successful!',
      data: { id: record.id, userId: record.user_id, createdAt: record.created_at },
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: 'Internal server error. Please try again.' }, { status: 500 });
  }
}