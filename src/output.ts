import type { MonitorStatus, ProcessInfo } from './types.js';

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

const SYMBOLS = {
  video: '\uD83D\uDCF9',       // 📹 video camera
  audio: '\uD83C\uDF99\uFE0F', // 🎙️ studio microphone
};

export function formatStatus(status: MonitorStatus, jsonOutput: boolean): string {
  if (jsonOutput) {
    return formatJson(status);
  }
  return formatHuman(status);
}

function formatJson(status: MonitorStatus): string {
  return JSON.stringify({
    camera: {
      active: status.camera.active,
      timestamp: status.camera.timestamp.toISOString(),
    },
    microphone: {
      active: status.microphone.active,
      timestamp: status.microphone.timestamp.toISOString(),
    },
    devices: status.devices.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      active: d.active,
      timestamp: d.timestamp.toISOString(),
    })),
    processes: status.processes,
  });
}

function formatHuman(status: MonitorStatus): string {
  const lines: string[] = [];

  // Status cards at top
  lines.push(`${formatStatusCard('Video', SYMBOLS.video, status.camera.active)}    ${formatStatusCard('Audio', SYMBOLS.audio, status.microphone.active)}`);
  lines.push('');

  // Process info if any
  if (status.processes?.camera?.length) {
    lines.push(`${COLORS.dim}Video: ${formatProcessList(status.processes.camera)}${COLORS.reset}`);
  }
  if (status.processes?.microphone?.length) {
    lines.push(`${COLORS.dim}Audio: ${formatProcessList(status.processes.microphone)}${COLORS.reset}`);
  }
  if (status.processes?.camera?.length || status.processes?.microphone?.length) {
    lines.push('');
  }

  // Device list
  lines.push(`${COLORS.dim}─── Devices ───${COLORS.reset}`);
  lines.push('');

  for (const device of status.devices) {
    const symbol = device.type === 'video' ? SYMBOLS.video : SYMBOLS.audio;
    lines.push(`${COLORS.dim}  ${symbol}  ${device.name}${COLORS.reset}`);
  }

  return lines.join('\n');
}

function formatStatusCard(label: string, symbol: string, active: boolean): string {
  if (active) {
    return `${COLORS.bgRed}${COLORS.white}${COLORS.bold} ${symbol}  ${label}: ACTIVE ${COLORS.reset}`;
  }
  return `${COLORS.bgGray}${COLORS.white} ${symbol}  ${label}: idle   ${COLORS.reset}`;
}

function formatProcessList(processes: ProcessInfo[]): string {
  return processes.map(p => `${p.name} (${p.pid})`).join(', ');
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
