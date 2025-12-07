import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessInfo } from '../types.js';

const execAsync = promisify(exec);

export class ProcessDetector {
  async getCameraProcesses(): Promise<ProcessInfo[]> {
    const processes = new Map<number, ProcessInfo>();

    // Try multiple patterns for camera processes
    const patterns = ['VDC', 'AppleCamera', 'iSight', 'FaceTime'];

    for (const pattern of patterns) {
      try {
        const { stdout } = await execAsync(
          `lsof 2>/dev/null | grep -i "${pattern}" | awk '{print $1, $2}'`,
          { timeout: 10000 }
        );
        this.parseLsofOutput(stdout, processes);
      } catch {
        // Pattern not found, continue
      }
    }

    return Array.from(processes.values());
  }

  async getMicrophoneProcesses(): Promise<ProcessInfo[]> {
    const processes = new Map<number, ProcessInfo>();

    try {
      const { stdout } = await execAsync(
        'lsof 2>/dev/null | grep -i "coreaudio" | awk \'{print $1, $2}\'',
        { timeout: 10000 }
      );
      this.parseLsofOutput(stdout, processes);
    } catch {
      // No matches found
    }

    // Filter out system processes that always use CoreAudio
    const systemProcesses = new Set(['coreaudiod', 'audiod', 'systemsoundserverd']);

    return Array.from(processes.values())
      .filter(p => !systemProcesses.has(p.name.toLowerCase()));
  }

  private parseLsofOutput(output: string, processes: Map<number, ProcessInfo>): void {
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      const name = parts[0];
      const pidStr = parts[1];

      if (name && pidStr) {
        const pid = parseInt(pidStr, 10);
        if (!isNaN(pid) && !processes.has(pid)) {
          processes.set(pid, { pid, name });
        }
      }
    }
  }
}
