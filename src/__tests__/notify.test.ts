import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'node:child_process';
import { sendNotification, notifyDeviceChange } from '../notify.js';

// Mock child_process.exec
vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd, callback) => callback(null, '', '')),
}));

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendNotification', () => {
    it('calls osascript with correct parameters', () => {
      sendNotification('Test Title', 'Test Message');

      expect(exec).toHaveBeenCalledTimes(1);
      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('osascript');
      expect(call).toContain('Test Title');
      expect(call).toContain('Test Message');
    });

    it('escapes double quotes in title and message', () => {
      sendNotification('Title "with" quotes', 'Message "with" quotes');

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('Title \\"with\\" quotes');
      expect(call).toContain('Message \\"with\\" quotes');
    });

    it('includes sound in notification', () => {
      sendNotification('Title', 'Message');

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('sound name');
    });
  });

  describe('notifyDeviceChange', () => {
    it('sends "active" notification when camera turns on', () => {
      notifyDeviceChange('camera', true);

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('Camera is now active');
    });

    it('sends "stopped" notification when camera turns off', () => {
      notifyDeviceChange('camera', false);

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('Camera stopped');
    });

    it('sends "active" notification when microphone turns on', () => {
      notifyDeviceChange('microphone', true);

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('Microphone is now active');
    });

    it('sends "stopped" notification when microphone turns off', () => {
      notifyDeviceChange('microphone', false);

      const call = (exec as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call).toContain('Microphone stopped');
    });
  });
});
