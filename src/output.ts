import type { MonitorStatus, HistoryEvent } from './types.js';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  bgRed: '\x1b[41m',
  bgGray: '\x1b[100m',
  white: '\x1b[97m',
};

export const SYMBOLS = {
  video: '\uD83D\uDCF9', // 📹 video camera
  audio: '\uD83C\uDF99\uFE0F', // 🎙️ studio microphone
};

export function formatStatus(
  status: MonitorStatus,
  jsonOutput: boolean,
  history: HistoryEvent[] = []
): string {
  if (jsonOutput) {
    return formatJson(status, history);
  }
  return formatHuman(status, history);
}

function formatJson(status: MonitorStatus, history: HistoryEvent[]): string {
  return JSON.stringify({
    camera: {
      active: status.camera.active,
      timestamp: status.camera.timestamp.toISOString(),
    },
    microphone: {
      active: status.microphone.active,
      timestamp: status.microphone.timestamp.toISOString(),
    },
    devices: status.devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      active: d.active,
      timestamp: d.timestamp.toISOString(),
    })),
    history: history.map((h) => ({
      timestamp: h.timestamp.toISOString(),
      device: h.device,
      active: h.active,
    })),
  });
}

function formatHuman(status: MonitorStatus, history: HistoryEvent[]): string {
  const lines: string[] = [];

  // Status cards at top
  lines.push(
    `${formatStatusCard('Video', SYMBOLS.video, status.camera.active)}    ${formatStatusCard('Audio', SYMBOLS.audio, status.microphone.active)}`
  );
  lines.push('');

  // Device list
  lines.push(`${COLORS.dim}─── Devices ───${COLORS.reset}`);
  lines.push('');

  for (const device of status.devices) {
    const symbol = device.type === 'video' ? SYMBOLS.video : SYMBOLS.audio;
    lines.push(`${COLORS.dim}  ${symbol}  ${device.name}${COLORS.reset}`);
  }

  // History section
  lines.push('');
  lines.push(`${COLORS.dim}─── History ───${COLORS.reset}`);
  lines.push('');

  if (history.length === 0) {
    lines.push(`${COLORS.dim}  No events yet${COLORS.reset}`);
  } else {
    for (const event of history) {
      const symbol = event.device === 'camera' ? SYMBOLS.video : SYMBOLS.audio;
      const time = event.timestamp.toLocaleTimeString();
      const state = event.active
        ? `${COLORS.red}ACTIVE${COLORS.reset}`
        : `${COLORS.gray}stopped${COLORS.reset}`;
      lines.push(`${COLORS.dim}  ${time}${COLORS.reset}  ${symbol}  ${state}`);
    }
  }

  return lines.join('\n');
}

function formatStatusCard(label: string, symbol: string, active: boolean): string {
  if (active) {
    return `${COLORS.bgRed}${COLORS.white}${COLORS.bold} ${symbol}  ${label}: ACTIVE ${COLORS.reset}`;
  }
  return `${COLORS.bgGray}${COLORS.white} ${symbol}  ${label}: idle   ${COLORS.reset}`;
}

export function printHeader(): void {
  console.log(`${COLORS.bold}watchav${COLORS.reset} - macOS Camera/Microphone Monitor`);
  console.log(`${COLORS.dim}Press Ctrl+C to exit${COLORS.reset}`);
  console.log('');
}

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function printError(message: string): void {
  console.error(`${COLORS.red}Error:${COLORS.reset} ${message}`);
}

export function printInfo(message: string): void {
  console.log(`${COLORS.dim}${message}${COLORS.reset}`);
}
