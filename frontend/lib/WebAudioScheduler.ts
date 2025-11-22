// webAudioScheduler.ts - Web Audio scheduling helper
import { audioContextManager } from './audioContextManager';
import { SyncOptimization } from './SyncOptimization';

export interface ScheduleParams {
  audioUrl: string;
  offsetSeconds: number;
  targetServerTimeMs: number; // server (unix) time we want playback to align to
  serverOffsetMs: number; // estimated server offset (server - client)
  volume?: number; // 0..1
}

export interface ScheduledPlayback {
  source: AudioBufferSourceNode;
  when: number; // context time
  started: boolean;
}

const bufferCache = new SyncOptimization.LRU<AudioBuffer>(3);
const inflightFetches = new Map<string, Promise<AudioBuffer>>();

async function fetchAndDecode(url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  if (inflightFetches.has(url)) return inflightFetches.get(url)!;
  const p = (async () => {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await audioContextManager.decodeAudioData(arr);
    bufferCache.set(url, buf);
    return buf;
  })();
  inflightFetches.set(url, p);
  try {
    const buf = await p;
    inflightFetches.delete(url);
    return buf;
  } catch (e) {
    inflightFetches.delete(url);
    throw e;
  }
}

export async function scheduleWebAudio(params: ScheduleParams): Promise<ScheduledPlayback> {
  const ctx = audioContextManager.getContext();
  const buffer = await fetchAndDecode(params.audioUrl);
  const estServerNow = Date.now() + params.serverOffsetMs;
  const waitMs = Math.max(0, params.targetServerTimeMs - estServerNow);
  // Late detection: return early with started=false for caller to trigger resync
  if (SyncOptimization.isLateSchedule(waitMs, 0)) {
    return { source: ctx.createBufferSource(), when: ctx.currentTime, started: false };
  }
  const when = ctx.currentTime + waitMs / 1000;
  const source = audioContextManager.createBufferSource();
  source.buffer = buffer;
  const gain = audioContextManager.getMasterGain();
  const vol = typeof params.volume === 'number' ? params.volume : 1;
  audioContextManager.setMasterGain(vol); // base value
  // Apply gentle fade-in
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(gain.gain.value, when + 0.08);
  source.connect(gain);
  source.start(when, params.offsetSeconds);
  return { source, when, started: true };
}

export function stopSource(source?: AudioBufferSourceNode) {
  try { source && source.stop(); } catch {}
}
