import { logger } from '../../lib/logger.js';

export interface WebRTCStatsReport {
  rttMs: number;
  bitrateKbps: number;
  fps: number;
  packetLossPct: number;
  jitterMs: number;
  candidateType: 'host' | 'srflx' | 'relay' | 'unknown';
}

export class WebRTCStatsMonitor {
  private timer: number | null = null;
  private lastBytes: number = 0;
  private lastTimestamp: number = 0;

  start(pc: RTCPeerConnection, onStats: (report: WebRTCStatsReport) => void, intervalMs = 1000): void {
    this.stop();

    this.timer = window.setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') {
        this.stop();
        return;
      }

      try {
        const stats = await pc.getStats();
        let rttMs = 0;
        let bitrateKbps = 0;
        let fps = 0;
        let packetsLost = 0;
        let packetsTotal = 0;
        let jitterMs = 0;
        let candidateType: 'host' | 'srflx' | 'relay' | 'unknown' = 'unknown';

        let currentBytes = 0;
        let currentTimestamp = Date.now();

        stats.forEach((report) => {
          // Candidate pair stats
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rttMs = Math.round((report.currentRoundTripTime ?? 0) * 1000);
          }

          // Remote candidate stats (to detect Relay / TURN)
          if (report.type === 'remote-candidate') {
            const type = report.candidateType as string;
            if (type === 'relay') candidateType = 'relay';
            else if (type === 'srflx') candidateType = 'srflx';
            else if (type === 'host') candidateType = 'host';
          }

          // Inbound RTP video stats (Viewer side)
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond ?? 0;
            currentBytes = report.bytesReceived ?? 0;
            currentTimestamp = report.timestamp ?? Date.now();
            packetsLost = report.packetsLost ?? 0;
            packetsTotal = (report.packetsReceived ?? 0) + packetsLost;
            jitterMs = Math.round((report.jitter ?? 0) * 1000);
          }

          // Outbound RTP video stats (Host side)
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond ?? 0;
            currentBytes = report.bytesSent ?? 0;
            currentTimestamp = report.timestamp ?? Date.now();
          }
        });

        // Compute bitrate kbps delta
        if (this.lastTimestamp > 0 && currentTimestamp > this.lastTimestamp) {
          const timeDiffSec = (currentTimestamp - this.lastTimestamp) / 1000;
          const bytesDiff = currentBytes - this.lastBytes;
          if (bytesDiff >= 0 && timeDiffSec > 0) {
            bitrateKbps = Math.round((bytesDiff * 8) / (timeDiffSec * 1000));
          }
        }

        this.lastBytes = currentBytes;
        this.lastTimestamp = currentTimestamp;

        const packetLossPct = packetsTotal > 0 ? Number(((packetsLost / packetsTotal) * 100).toFixed(1)) : 0;

        const report: WebRTCStatsReport = {
          rttMs,
          bitrateKbps,
          fps,
          packetLossPct,
          jitterMs,
          candidateType,
        };

        onStats(report);
      } catch (err) {
        logger.debug('Failed to fetch WebRTC getStats()', { err });
      }
    }, intervalMs);

    logger.info('WebRTCStatsMonitor started');
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('WebRTCStatsMonitor stopped');
    }
    this.lastBytes = 0;
    this.lastTimestamp = 0;
  }
}
