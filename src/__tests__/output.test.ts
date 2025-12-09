import { describe, it, expect } from 'vitest';
import { formatStatus } from '../output.js';
import type { MonitorStatus } from '../types.js';

describe('formatStatus', () => {
  const createMockStatus = (cameraActive = false, micActive = false): MonitorStatus => ({
    camera: {
      active: cameraActive,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    },
    microphone: {
      active: micActive,
      timestamp: new Date('2024-01-01T12:00:00Z'),
    },
    devices: [
      {
        id: 'camera-1',
        name: 'FaceTime HD Camera',
        type: 'video',
        active: cameraActive,
        timestamp: new Date('2024-01-01T12:00:00Z'),
      },
      {
        id: 'mic-1',
        name: 'MacBook Pro Microphone',
        type: 'audio',
        active: micActive,
        timestamp: new Date('2024-01-01T12:00:00Z'),
      },
    ],
  });

  describe('JSON output', () => {
    it('returns valid JSON', () => {
      const status = createMockStatus();
      const output = formatStatus(status, true);
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('includes camera status', () => {
      const status = createMockStatus(true, false);
      const output = JSON.parse(formatStatus(status, true));
      expect(output.camera.active).toBe(true);
      expect(output.camera.timestamp).toBe('2024-01-01T12:00:00.000Z');
    });

    it('includes microphone status', () => {
      const status = createMockStatus(false, true);
      const output = JSON.parse(formatStatus(status, true));
      expect(output.microphone.active).toBe(true);
    });

    it('includes device list', () => {
      const status = createMockStatus();
      const output = JSON.parse(formatStatus(status, true));
      expect(output.devices).toHaveLength(2);
      expect(output.devices[0].name).toBe('FaceTime HD Camera');
      expect(output.devices[1].name).toBe('MacBook Pro Microphone');
    });
  });

  describe('Human-readable output', () => {
    it('returns non-empty string', () => {
      const status = createMockStatus();
      const output = formatStatus(status, false);
      expect(output.length).toBeGreaterThan(0);
    });

    it('contains Video label', () => {
      const status = createMockStatus();
      const output = formatStatus(status, false);
      expect(output).toContain('Video');
    });

    it('contains Audio label', () => {
      const status = createMockStatus();
      const output = formatStatus(status, false);
      expect(output).toContain('Audio');
    });

    it('shows ACTIVE for active camera', () => {
      const status = createMockStatus(true, false);
      const output = formatStatus(status, false);
      expect(output).toContain('ACTIVE');
    });

    it('shows idle for inactive devices', () => {
      const status = createMockStatus(false, false);
      const output = formatStatus(status, false);
      expect(output).toContain('idle');
    });

    it('lists device names', () => {
      const status = createMockStatus();
      const output = formatStatus(status, false);
      expect(output).toContain('FaceTime HD Camera');
      expect(output).toContain('MacBook Pro Microphone');
    });
  });
});
