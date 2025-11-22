// Logger removed; no-op stub retained for potential future verbose output
const logger = { debug: ()=>{} };

class DeviceReadinessTracker {
  constructor() {
    this.deviceStatus = new Map(); // wsId -> { ready, loadedTracks:Set, lastCheck }
  }
  markReady(wsId) {
    const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
    status.ready = true;
    status.lastCheck = performance.now(); // monotonic
    this.deviceStatus.set(wsId, status);
  }
  markLoading(wsId) {
    const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
    status.ready = false;
    this.deviceStatus.set(wsId, status);
  }
  trackLoaded(wsId, trackUrl) {
    const status = this.deviceStatus.get(wsId) || { ready: false, loadedTracks: new Set(), lastCheck: 0 };
    status.loadedTracks.add(trackUrl);
    this.deviceStatus.set(wsId, status);
  }
  isReady(wsId) {
    const status = this.deviceStatus.get(wsId);
    return !!(status && status.ready);
  }
  allReady(room) {
    for (const client of room.clients) {
      if (!this.isReady(client._id)) return false;
    }
    return true;
  }
  removeDevice(wsId) {
    this.deviceStatus.delete(wsId);
  }
}

module.exports = DeviceReadinessTracker;
