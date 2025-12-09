import { exec } from 'node:child_process';
import { SYMBOLS } from './output.js';

export type DeviceType = 'camera' | 'microphone';

const DEVICE_LABELS: Record<DeviceType, { icon: string; name: string }> = {
  camera: { icon: SYMBOLS.video, name: 'Camera' },
  microphone: { icon: SYMBOLS.audio, name: 'Microphone' },
};

/**
 * Send a macOS desktop notification using osascript.
 */
export function sendNotification(title: string, message: string, verbose = false): void {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name "default"`;

  exec(`osascript -e '${script}'`, (error) => {
    if (error && verbose) {
      console.error('[verbose] Notification error:', error.message);
    }
  });
}

/**
 * Notify about device state change.
 */
export function notifyDeviceChange(device: DeviceType, active: boolean, verbose = false): void {
  const { icon, name } = DEVICE_LABELS[device];
  const message = active ? `${icon} ${name} is now active` : `${icon} ${name} stopped`;
  sendNotification('watchav', message, verbose);
}
