import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    // Check public/uploads first
    const publicPath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);
    const rootPath = path.join(process.cwd(), 'uploads', ...pathSegments);

    let filePath = '';
    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    } else if (fs.existsSync(rootPath)) {
      filePath = rootPath;
    } else {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return new NextResponse('Error reading file: ' + err.message, { status: 500 });
  }
}
