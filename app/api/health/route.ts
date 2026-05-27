import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cwd = process.cwd();
  const staticDir = path.join(cwd, '.next', 'static');
  const publicDir = path.join(cwd, 'public');

  const hasStaticDir = fs.existsSync(staticDir);
  const hasPublicDir = fs.existsSync(publicDir);

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cwd,
    checks: {
      nextStaticDirectoryPresent: hasStaticDir,
      publicDirectoryPresent: hasPublicDir,
    },
  });
}
