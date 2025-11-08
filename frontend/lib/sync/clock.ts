import type { Socket } from 'socket.io-client';

export type Clock = { offset: number; rtt: number };

export async function syncClock(
  socket: Socket, 
  samples = 8, 
  delayMs = 50
): Promise<Clock> {
  const results: Clock[] = [];
  
  for (let i = 0; i < samples; i++) {
    const clientSentAt = Date.now();
    
    const pong = await new Promise<{ clientSentAt: number; serverSentAt: number }>((resolve) => {
      const handler = (payload: { clientSentAt: number; serverSentAt: number }) => {
        socket.off('clock:pong', handler);
        resolve(payload);
      };
      socket.on('clock:pong', handler);
      socket.emit('clock:ping', clientSentAt);
    });
    
    const clientRecvAt = Date.now();
    const rtt = clientRecvAt - pong.clientSentAt;
    
    const serverTimeAtClientRecv = pong.serverSentAt + rtt / 2;
    const offset = serverTimeAtClientRecv - clientRecvAt;
    
    results.push({ offset, rtt });
    
    if (i < samples - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  results.sort((a, b) => a.rtt - b.rtt);
  return results[0];
}

export function toClientTime(serverTime: number, offset: number): number {
  return serverTime - offset;
}

export function toServerTime(clientTime: number, offset: number): number {
  return clientTime + offset;
}