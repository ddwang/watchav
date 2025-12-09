import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { DeviceType, HistoryEvent } from './types.js';

const MAX_HISTORY_SIZE = 10;
const LOG_DIR = join(homedir(), '.watchav');
const LOG_FILE = join(LOG_DIR, 'events.log');

const history: HistoryEvent[] = [];

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatLogLine(event: HistoryEvent): string {
  const ts = event.timestamp.toISOString();
  const status = event.active ? 'ACTIVE' : 'STOPPED';
  return `[${ts}] ${event.device.toUpperCase()} ${status}\n`;
}

export function addEvent(device: DeviceType, active: boolean): void {
  const event: HistoryEvent = {
    timestamp: new Date(),
    device,
    active,
  };

  history.unshift(event);
  if (history.length > MAX_HISTORY_SIZE) {
    history.pop();
  }

  // Log to file
  try {
    ensureLogDir();
    appendFileSync(LOG_FILE, formatLogLine(event));
  } catch {
    // Silently ignore file logging errors
  }
}

export function getHistory(): HistoryEvent[] {
  return [...history];
}
