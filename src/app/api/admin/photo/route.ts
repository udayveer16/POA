import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  // Security: only allow access to Uploaded_files directory, prevent path traversal
  const normalised = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (!normalised.startsWith('Uploaded_files')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), normalised);

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = fs.readFileSync(absolutePath);
    // Return as image response so browser renders it inline (no download)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': 'inline',  // inline = view, not download
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Photo serve error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
