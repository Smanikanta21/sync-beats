import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Eventually this should query a Device table or active sessions cache.
// For now we return mock devices tied to the authenticated user.

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
    if (!token) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    const userId = payload.sub as string | undefined;
    if (!userId) {
      return NextResponse.json({ message: 'Invalid token payload' }, { status: 403 });
    }

    const now = Date.now();

    // Mock devices: in real implementation query DB or in-memory presence map
    const devices = [
      {
        id: 'dev-local-browser',
        name: 'This Browser',
        platform: 'web',
        status: 'online',
        lastSeen: new Date(now).toISOString(),
        capabilities: ['playback-control', 'latency-report'],
      },
      {
        id: 'dev-iphone',
        name: 'iPhone 15',
        platform: 'ios',
        status: 'online',
        lastSeen: new Date(now - 15_000).toISOString(),
        capabilities: ['playback-control'],
      },
      {
        id: 'dev-macbook',
        name: 'MacBook Pro',
        platform: 'macos',
        status: 'idle',
        lastSeen: new Date(now - 65_000).toISOString(),
        capabilities: ['playback-control', 'waveform-analysis'],
      },
    ];

    return NextResponse.json({ devices });
  } catch (err) {
    console.error('Devices API error:', err);
    let message = 'Failed to list devices';
    if (err instanceof Error) message = err.message + (err.stack ? '\n' + err.stack : '');
    else if (typeof err === 'string') message = err;
    return NextResponse.json({ message }, { status: 500 });
  }
}
