import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import pool from '@/lib/db';

// GET: list all events with token counts
export async function GET() {
  try {
    const result = await pool.query(`
      SELECT e.*,
        COUNT(at.id)::int AS issued_count
      FROM events e
      LEFT JOIN attendance_tokens at ON at.event_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    return NextResponse.json({ events: result.rows });
  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events.' }, { status: 500 });
  }
}

// POST: create a new event
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const eventDate = formData.get('eventDate') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const speaker = formData.get('speaker') as string;
    const category = formData.get('category') as string;
    const image = formData.get('image') as File | null;

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Event name and date are required.' }, { status: 400 });
    }

    let imagePath: string | null = null;

    if (image && image.size > 0) {
      const dir = path.join(process.cwd(), 'Uploaded_files', 'events');
      fs.mkdirSync(dir, { recursive: true });
      const fileName = `event_${Date.now()}.webp`;
      const filePath = path.join(dir, fileName);
      const raw = Buffer.from(await image.arrayBuffer());
      const compressed = await sharp(raw).webp({ lossless: true, effort: 6 }).toBuffer();
      fs.writeFileSync(filePath, compressed);
      imagePath = `Uploaded_files/events/${fileName}`;
    }

    const result = await pool.query(
      `INSERT INTO events (name, event_date, location, description, speaker, category, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, eventDate, location || null, description || null, speaker || null, category || null, imagePath]
    );

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('Event POST error:', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }
}