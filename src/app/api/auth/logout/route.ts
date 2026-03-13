import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('kyc_session')?.value;

    if (sessionToken) {
      await pool.query(`DELETE FROM user_sessions WHERE session_token = $1`, [sessionToken]);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('kyc_session', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}