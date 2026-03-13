import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const phone = searchParams.get('phone');

  if (!email && !phone) return NextResponse.json({ exists: false });

  try {
    if (email) {
      const result = await pool.query(
        'SELECT id FROM kyc_submissions WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
        [email]
      );
      if (result.rowCount && result.rowCount > 0)
        return NextResponse.json({ exists: true, field: 'email' });
    }
    if (phone) {
      const result = await pool.query(
        'SELECT id FROM kyc_submissions WHERE phone = $1 AND deleted_at IS NULL LIMIT 1',
        [phone]
      );
      if (result.rowCount && result.rowCount > 0)
        return NextResponse.json({ exists: true, field: 'phone' });
    }
    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json({ exists: false });
  }
}